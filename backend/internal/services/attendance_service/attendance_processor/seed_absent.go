package attendance_processor

import (
	"time"

	"github.com/wargasipil/facego/common_helpers"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	"github.com/wargasipil/facego/internal/db_models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func SeedAttendance(
	tx *gorm.DB,
) common_helpers.NextFuncParam[[]*db_models.DetectionLog] {
	var attendances []*db_models.Attendance
	var classSchedule map[int64]db_models.ClassScheduleList = map[int64]db_models.ClassScheduleList{}

	scheduleMap := map[int64]map[string]bool{}

	return common_helpers.NewChainParam(
		PreloadClassSchedule(tx, classSchedule), // preload class schedule
		func(next common_helpers.NextFuncParam[[]*db_models.DetectionLog]) common_helpers.NextFuncParam[[]*db_models.DetectionLog] {
			return func(batch []*db_models.DetectionLog) error { // mapping schedule

				for _, item := range batch {
					schedule := classSchedule[item.ClassID].GetSchedule(item.SeenAt)
					if schedule == nil {
						continue
					}

					if scheduleMap[schedule.ID] == nil {
						scheduleMap[schedule.ID] = map[string]bool{}
					}
					key := item.SeenAt.Format(time.DateOnly)
					scheduleMap[schedule.ID][key] = true
				}

				return next(batch)
			}
		},

		func(next common_helpers.NextFuncParam[[]*db_models.DetectionLog]) common_helpers.NextFuncParam[[]*db_models.DetectionLog] {
			return func(batch []*db_models.DetectionLog) error { // full join user schedule
				var err error
				var query *gorm.DB
				var userSchedule []struct {
					ClassId         int64
					UserId          int64
					ClassScheduleId int64
				}

				for classId, days := range scheduleMap {
					userSchedule = []struct {
						ClassId         int64
						UserId          int64
						ClassScheduleId int64
					}{}
					query = tx.
						Table("class_enrollments ce").
						Joins("left join class_schedules cs on cs.class_id = ce.class_id").
						Where("cs.id = ?", classId).
						Select([]string{
							"ce.class_id",
							"ce.user_id",
							"cs.id as class_schedule_id",
						})

					err = query.
						Find(&userSchedule).
						Error

					if err != nil {
						return err
					}

					for day := range days {
						dayt, err := time.Parse(time.DateOnly, day)
						if err != nil {
							return err
						}
						for _, user := range userSchedule {
							attendances = append(attendances,
								&db_models.Attendance{
									UserID:          user.UserId,
									ClassID:         user.ClassId,
									ClassScheduleID: user.ClassScheduleId,
									Day:             dayt,
									Status:          attendancev1.AttendanceStatus_ATTENDANCE_STATUS_ABSENT,
									CreatedAt:       time.Now(),
								},
							)
						}

					}
				}

				return next(batch)
			}
		},
		func(next common_helpers.NextFuncParam[[]*db_models.DetectionLog]) common_helpers.NextFuncParam[[]*db_models.DetectionLog] {
			return func(data []*db_models.DetectionLog) error { // saving attendance
				var err error

				for _, attendance := range attendances {
					err = tx.
						Clauses(clause.OnConflict{
							DoNothing: true,
						}).
						Save(attendance).
						Error

					if err != nil {
						return err
					}

				}

				return next(data)

			}
		},
	)
}

func PreloadClassSchedule(tx *gorm.DB, classSchedule map[int64]db_models.ClassScheduleList) common_helpers.NextHandlerParam[[]*db_models.DetectionLog] {
	return func(next common_helpers.NextFuncParam[[]*db_models.DetectionLog]) common_helpers.NextFuncParam[[]*db_models.DetectionLog] {
		return func(batch []*db_models.DetectionLog) error {
			var err error

			classIds := []int64{}
			for _, item := range batch {
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

			return next(batch)
		}
	}
}
