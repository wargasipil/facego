package class_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) UpdateSchedule(
	ctx context.Context,
	req *connect.Request[classesv1.UpdateScheduleRequest],
) (*connect.Response[classesv1.UpdateScheduleResponse], error) {
	msg := req.Msg
	result := s.db.WithContext(ctx).
		Model(&db_models.ClassSchedule{}).
		Where("id = ?", msg.Id).
		Updates(map[string]any{
			"day_of_week": msg.DayOfWeek,
			"start_time":  parseScheduleTime(msg.StartTime),
			"end_time":    parseScheduleTime(msg.EndTime),
			"subject":     msg.Subject,
			"room":        msg.Room,
		})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("schedule not found"))
	}

	var model db_models.ClassSchedule
	if err := s.db.WithContext(ctx).First(&model, msg.Id).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&classesv1.UpdateScheduleResponse{Schedule: scheduleToProto(model)}), nil
}
