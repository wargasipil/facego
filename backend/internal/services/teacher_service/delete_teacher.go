package teacher_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	teachersv1 "github.com/wargasipil/facego/gen/teachers/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) DeleteTeacher(
	ctx context.Context,
	req *connect.Request[teachersv1.DeleteTeacherRequest],
) (*connect.Response[teachersv1.DeleteTeacherResponse], error) {
	result := s.db.WithContext(ctx).
		Where("id = ?", req.Msg.Id).
		Delete(&db_models.Teacher{})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("teacher not found"))
	}
	return connect.NewResponse(&teachersv1.DeleteTeacherResponse{}), nil
}
