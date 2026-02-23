package class_service

import (
	"context"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) CreateClass(
	ctx context.Context,
	req *connect.Request[classesv1.CreateClassRequest],
) (*connect.Response[classesv1.CreateClassResponse], error) {
	msg := req.Msg

	model := db_models.Class{
		Name:        msg.Name,
		GradeID:     uint(msg.GradeId),
		TeacherID:   uint(msg.TeacherId),
		Description: msg.Description,
	}
	if msg.StudyProgramId > 0 {
		spID := uint(msg.StudyProgramId)
		model.StudyProgramID = &spID
	}
	if err := s.db.WithContext(ctx).Create(&model).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	class, err := s.fetchClass(ctx, int64(model.ID))
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&classesv1.CreateClassResponse{Class: class}), nil
}
