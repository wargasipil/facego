package grade_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	gradesv1 "github.com/wargasipil/facego/gen/grades/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) DeleteGrade(
	ctx context.Context,
	req *connect.Request[gradesv1.DeleteGradeRequest],
) (*connect.Response[gradesv1.DeleteGradeResponse], error) {
	result := s.db.WithContext(ctx).
		Where("id = ?", req.Msg.Id).
		Delete(&db_models.Grade{})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("grade not found"))
	}
	return connect.NewResponse(&gradesv1.DeleteGradeResponse{}), nil
}
