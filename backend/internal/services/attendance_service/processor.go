package attendance_service

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/wargasipil/facego/common_helpers"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"gorm.io/gorm"
)

const (
	processorInterval  = 10 * time.Second
	processorBatchSize = 200

	// lateToleranceMinutes: detections within this many minutes of schedule
	// start_time are "present"; detections beyond this are "late".
	lateToleranceMinutes = 15
)

// StartProcessor launches a background goroutine that periodically converts
// unprocessed DetectionLog rows into Attendance records.
// It runs once immediately, then every processorInterval. Stops when ctx is cancelled.
func (s *Service) StartProcessor(ctx context.Context) {
	go s.runProcessor(ctx)
}

func (s *Service) runProcessor(ctx context.Context) {
	timer := time.NewTimer(processorInterval)
	defer timer.Stop()

	slog.Info("attendance processor started", "interval", processorInterval)
	s.processBatch(ctx) // run immediately on startup

	for {
		select {
		case <-ctx.Done():
			slog.Info("attendance processor stopped")
			return
		case <-timer.C:
			func() {
				defer timer.Reset(processorInterval)
				s.processBatch(ctx)
			}()

		}
	}
}

// processBatch fetches up to processorBatchSize unprocessed DetectionLog rows
// and converts each into an Attendance record where appropriate.
func (s *Service) processBatch(ctx context.Context) {
	var err error

	db := s.db.WithContext(ctx)

	err = db.Transaction(func(tx *gorm.DB) error {
		var logs []db_models.DetectionLog
		var classLogs []db_models.Class
		var classSchedule map[int64][]*db_models.ClassSchedule = map[int64][]*db_models.ClassSchedule{}

		logsQuery := tx.
			Table("detection_logs dl").
			Where("is_processed = ?", false).
			Order("seen_at ASC").
			Limit(processorBatchSize).
			Order("id asc")

		classQuery := tx.
			Table(
				"(?) cl",
				logsQuery.
					Select([]string{
						"dl.id as log_id",
						"dl.class_id",
					}),
			).
			Joins("left join classes c on c.id = cl.class_id").
			Order("dl.log_id asc").
			Select("c.*")

		return common_helpers.NewChain(
			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // getting detection log
					err = logsQuery.
						Find(&logs).
						Error

					if err != nil {
						return err
					}

					if len(logs) == 0 {
						return nil
					}

					return next()
				}
			},
			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // preload class
					err = classQuery.
						Find(&classLogs).
						Error

					if err != nil {
						return err
					}

					return next()
				}
			},
			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // preloading schedule
					classIds := []int64{}
					for _, item := range logs {
						classIds = append(classIds, item.ClassID)
					}

					var schedules []db_models.ClassSchedule

					err = tx.
						Model(db_models.ClassSchedule{}).
						Where("class_id in ?", classIds).
						Find(&schedules).
						Error

					if err != nil {
						return err
					}
					var key int64
					for _, sched := range schedules {
						key = int64(sched.ClassID)
						if classSchedule[key] == nil {
							classSchedule[key] = []*db_models.ClassSchedule{}
						}

						classSchedule[key] = append(classSchedule[key], &sched)
					}

					return next()
				}
			},
			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // create attendance
					return next()
				}
			},
			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // set processing true
					logIds := []int64{}
					for _, log := range logs {
						logIds = append(logIds, log.ID)
					}

					err = db.
						Model(&db_models.DetectionLog{}).
						Where("id in ?", logIds).
						Update("is_processed = ?", true).
						Error

					if err != nil {
						return err
					}

					return next()
				}
			},
		)
	}, &sql.TxOptions{
		Isolation: sql.LevelRepeatableRead,
	})

	if err != nil {
		slog.Error("batch processing error", "err", err.Error())
		return
	}
}
