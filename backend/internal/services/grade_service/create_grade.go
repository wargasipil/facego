package grade_service

import (
	"context"

	"connectrpc.com/connect"
	gradesv1 "github.com/wargasipil/facego/gen/grades/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) CreateGrade(
	ctx context.Context,
	req *connect.Request[gradesv1.CreateGradeRequest],
) (*connect.Response[gradesv1.CreateGradeResponse], error) {
	msg := req.Msg

	model := db_models.Grade{
		Level:       msg.Level,
		Label:       msg.Label,
		Description: msg.Description,
	}
	if err := s.db.WithContext(ctx).Create(&model).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	grade, err := s.fetchGrade(ctx, int64(model.ID))
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&gradesv1.CreateGradeResponse{Grade: grade}), nil
}
