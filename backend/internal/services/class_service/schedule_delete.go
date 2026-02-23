package class_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) DeleteSchedule(
	ctx context.Context,
	req *connect.Request[classesv1.DeleteScheduleRequest],
) (*connect.Response[classesv1.DeleteScheduleResponse], error) {
	result := s.db.WithContext(ctx).
		Where("id = ?", req.Msg.Id).
		Delete(&db_models.ClassSchedule{})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("schedule not found"))
	}
	return connect.NewResponse(&classesv1.DeleteScheduleResponse{}), nil
}
