package class_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) UnenrollStudent(
	ctx context.Context,
	req *connect.Request[classesv1.UnenrollStudentRequest],
) (*connect.Response[classesv1.UnenrollStudentResponse], error) {
	result := s.db.WithContext(ctx).
		Where("class_id = ? AND user_id = ?", req.Msg.ClassId, req.Msg.UserId).
		Delete(&db_models.ClassEnrollment{})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("enrollment not found"))
	}
	return connect.NewResponse(&classesv1.UnenrollStudentResponse{}), nil
}
