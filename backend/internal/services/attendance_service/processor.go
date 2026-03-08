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
	"github.com/wargasipil/facego/pkgs/runner"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	processorBatchSize = 200
)

type AttendanceProcessorFunc runner.RunnerFunc

func NewAttendanceProcessor(
	db *gorm.DB,
) AttendanceProcessorFunc {
	return func(wctx *runner.RunnerContext) error {
		var err error

		ctx, cancel := context.WithTimeout(wctx, time.Minute*15)
		defer cancel()

		db := db.WithContext(ctx)

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

							tstr := item.SeenAt.Format(time.DateOnly)
							dayOnly, err := time.Parse(time.DateOnly, tstr)
							if err != nil {
								return err
							}

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
							err = tx.
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

						err = tx.
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
			return err
		}

		return err
	}
}
