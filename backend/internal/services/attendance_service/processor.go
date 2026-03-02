package attendance_service

import (
	"context"
	"database/sql"
	"log/slog"
	"time"

	"github.com/wargasipil/facego/common_helpers"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"github.com/wargasipil/facego/internal/services/attendance_service/attendance_processor"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
	s.ProcessBatch(ctx) // run immediately on startup

	for {
		select {
		case <-ctx.Done():
			slog.Info("attendance processor stopped")
			return
		case <-timer.C:
			func() {
				defer timer.Reset(processorInterval)
				s.ProcessBatch(ctx)
			}()
		}
	}
}

// processBatch fetches up to processorBatchSize unprocessed DetectionLog rows
// and converts each into an Attendance record where appropriate.
// donot touch, im write my own
func (s *Service) ProcessBatch(ctx context.Context) {
	var err error

	db := s.db.WithContext(ctx)

	err = db.Transaction(func(tx *gorm.DB) error {
		var logs []*db_models.DetectionLog
		var classLogs []db_models.Class
		classSchedule := map[int64]db_models.ClassScheduleList{}
		var attendances []*db_models.Attendance

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
					Session(&gorm.Session{}).
					Select([]string{
						"dl.id as log_id",
						"dl.class_id",
					}),
			).
			Joins("left join classes c on c.id = cl.class_id").
			Order("cl.log_id asc").
			Select("c.*")

		return common_helpers.NewChain(
			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // getting detection log
					err = logsQuery.Find(&logs).Error
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
				return func() error { // seeding absent

					// createing processing
					seed := attendance_processor.SeedAttendance(tx)

					err := seed(logs)
					if err != nil {
						return err
					}

					return next()
				}
			},

			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // preload class
					err = classQuery.Find(&classLogs).Error
					if err != nil {
						return err
					}
					return next()
				}
			},
			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // preload schedules
					classIds := []int64{}
					for _, item := range logs {
						classIds = append(classIds, item.ClassID)
					}

					var schedules []db_models.ClassSchedule
					err = tx.
						Model(&db_models.ClassSchedule{}).
						Where("class_id in ?", classIds).
						Find(&schedules).Error
					if err != nil {
						return err
					}

					for i, sched := range schedules {
						key := sched.ClassID
						classSchedule[key] = append(classSchedule[key], &schedules[i])
					}

					return next()
				}
			},
			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // create attendance data
					for _, item := range logs {
						schedule := classSchedule[item.ClassID].GetSchedule(item.SeenAt)
						if schedule == nil {
							slog.Warn("slot schedule not found", "user_id", item.UserID)
							continue
						}

						year, month, day := item.SeenAt.Date()
						dayOnly := time.Date(year, month, day, 0, 0, 0, 0, item.SeenAt.Location())

						attend := db_models.Attendance{
							UserID:          item.UserID,
							ClassID:         item.ClassID,
							ClassScheduleID: schedule.ID,
							Status:          attendancev1.AttendanceStatus_ATTENDANCE_STATUS_PRESENT,
							CheckInTime:     item.SeenAt,
							CreatedAt:       time.Now(),
							Day:             dayOnly,
						}

						attendances = append(attendances, &attend)

					}

					return next()
				}
			},
			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // saving attendance
					for _, item := range attendances {
						err = db.
							Clauses(clause.OnConflict{
								Columns: []clause.Column{
									{Name: "user_id"},
									{Name: "class_id"},
									{Name: "class_schedule_id"},
									{Name: "day"},
								}, // conflict target
								DoUpdates: clause.AssignmentColumns([]string{"status", "check_in_time"}),
							}).Create(&item).
							Error
						if err != nil {
							slog.Warn(err.Error())
							continue
						}
					}

					return next()
				}
			},
			func(next common_helpers.NextFunc) common_helpers.NextFunc {
				return func() error { // mark processed
					logIds := []int64{}
					for _, log := range logs {
						logIds = append(logIds, log.ID)
					}

					err = db.
						Model(&db_models.DetectionLog{}).
						Where("id in ?", logIds).
						Update("is_processed", true).
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
