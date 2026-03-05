package attendance_service

import (
	"context"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/wargasipil/facego/common_helpers"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	attendancev1connect "github.com/wargasipil/facego/gen/attendance/v1/attendancev1connect"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

var _ attendancev1connect.AttendanceServiceHandler = (*Service)(nil)

// do not touch, im implemented my own
func (s *Service) GetDailyAttendance(
	ctx context.Context,
	req *connect.Request[attendancev1.GetDailyAttendanceRequest],
) (*connect.Response[attendancev1.GetDailyAttendanceResponse], error) {
	var err error

	result := attendancev1.GetDailyAttendanceResponse{
		Records: []*attendancev1.AttendanceRecord{},
		Summary: &attendancev1.AttendanceSummary{},
		Total:   0,
	}
	filter := req.Msg.Filter
	pay := req.Msg

	db := s.db.WithContext(ctx).Debug()

	err = common_helpers.NewChainParam(
		func(next common_helpers.NextFuncParam[*gorm.DB]) common_helpers.NextFuncParam[*gorm.DB] {
			return func(query *gorm.DB) error { // creating base and filtering
				query = query.
					Table("attendances a").
					Joins("left join users u on u.id = a.user_id")

				search := strings.TrimSpace(filter.Q)
				if search != "" {
					query = query.
						Where("u.name ilike ?", "%"+search+"%")
				}

				if filter.ClassId != 0 {
					query = query.
						Where("a.class_id = ?", filter.ClassId)

				}

				if filter.ScheduleId != 0 {
					query = query.
						Where("a.class_schedule_id = ?", filter.ScheduleId)
				}

				if filter.Date.IsValid() {
					tfilter := filter.Date.AsTime().In(time.Local)
					query = query.
						Where("date(a.day) = ?", tfilter.Format(time.DateOnly))
				}

				return next(query)
			}
		},
		func(next common_helpers.NextFuncParam[*gorm.DB]) common_helpers.NextFuncParam[*gorm.DB] {
			return func(query *gorm.DB) error { // getting total
				err = query.
					Session(&gorm.Session{}).
					Select("count(a.id)").
					Find(&result.Total).
					Error

				if err != nil {
					return err
				}

				return next(query)
			}
		},
		func(next common_helpers.NextFuncParam[*gorm.DB]) common_helpers.NextFuncParam[*gorm.DB] {
			return func(query *gorm.DB) error { // adding order
				query = query.
					Order("u.name asc").
					Limit(int(pay.PageSize))

				if pay.Page > 1 {
					offset := (pay.Page - 1) * pay.PageSize
					query = query.
						Offset(int(offset))
				}

				return next(query)
			}
		},
		func(next common_helpers.NextFuncParam[*gorm.DB]) common_helpers.NextFuncParam[*gorm.DB] {
			return func(query *gorm.DB) error { // getting data
				datas := []struct {
					Id              int64
					UserId          int64
					ClassScheduleId int64
					ClassId         int64
					Day             time.Time
					Status          attendancev1.AttendanceStatus
					NotifyStatus    attendancev1.NotifyStatus
					CheckInTime     time.Time
					CreatedAt       time.Time
				}{}

				err = query.
					Session(&gorm.Session{}).
					Select("a.*").
					Find(&datas).
					Error

				if err != nil {
					return err
				}

				for _, data := range datas {
					result.Records = append(result.Records, &attendancev1.AttendanceRecord{
						Id:              data.Id,
						UserId:          data.UserId,
						ClassId:         data.ClassId,
						ClassScheduleId: data.ClassScheduleId,
						Day:             timestamppb.New(data.Day),
						Status:          data.Status,
						NotifyStatus:    data.NotifyStatus,
						CheckInTime:     timestamppb.New(data.CheckInTime),
						CreatedAt:       timestamppb.New(data.CreatedAt),
					})
				}

				return next(query)
			}
		},
		func(next common_helpers.NextFuncParam[*gorm.DB]) common_helpers.NextFuncParam[*gorm.DB] {
			return func(query *gorm.DB) error {
				users := []*attendancev1.UserAttendance{}
				err = query.
					Session(&gorm.Session{}).
					Select("u.*").
					Find(&users).
					Error

				if err != nil {
					return err
				}

				for i, user := range users {
					result.Records[i].Student = user
				}

				return next(query)
			}
		},
	)(db)

	if err != nil {
		return connect.NewResponse(&result), err
	}

	return connect.NewResponse(&result), err
}
