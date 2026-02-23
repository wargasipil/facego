package grade_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	gradesv1 "github.com/wargasipil/facego/gen/grades/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) UpdateGrade(
	ctx context.Context,
	req *connect.Request[gradesv1.UpdateGradeRequest],
) (*connect.Response[gradesv1.UpdateGradeResponse], error) {
	msg := req.Msg

	result := s.db.WithContext(ctx).
		Model(&db_models.Grade{}).
		Where("id = ?", msg.Id).
		Updates(map[string]any{
			"level":       msg.Level,
			"label":       msg.Label,
			"description": msg.Description,
		})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("grade not found"))
	}

	grade, err := s.fetchGrade(ctx, msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&gradesv1.UpdateGradeResponse{Grade: grade}), nil
}
