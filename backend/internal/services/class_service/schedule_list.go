package class_service

import (
	"context"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) ListSchedules(
	ctx context.Context,
	req *connect.Request[classesv1.ListSchedulesRequest],
) (*connect.Response[classesv1.ListSchedulesResponse], error) {
	var models []db_models.ClassSchedule
	if err := s.db.WithContext(ctx).
		Where("class_id = ?", req.Msg.ClassId).
		Order("day_of_week, start_time").
		Find(&models).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	schedules := make([]*classesv1.ClassSchedule, len(models))
	for i, m := range models {
		schedules[i] = scheduleToProto(m)
	}
	return connect.NewResponse(&classesv1.ListSchedulesResponse{Schedules: schedules}), nil
}
