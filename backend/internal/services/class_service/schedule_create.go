package class_service

import (
	"context"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) CreateSchedule(
	ctx context.Context,
	req *connect.Request[classesv1.CreateScheduleRequest],
) (*connect.Response[classesv1.CreateScheduleResponse], error) {
	msg := req.Msg
	model := db_models.ClassSchedule{
		ClassID:   uint(msg.ClassId),
		DayOfWeek: msg.DayOfWeek,
		StartTime: msg.StartTime,
		EndTime:   msg.EndTime,
		Subject:   msg.Subject,
		Room:      msg.Room,
	}
	if err := s.db.WithContext(ctx).Create(&model).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&classesv1.CreateScheduleResponse{Schedule: scheduleToProto(model)}), nil
}
