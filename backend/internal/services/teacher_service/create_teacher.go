package teacher_service

import (
	"context"

	"connectrpc.com/connect"
	teachersv1 "github.com/wargasipil/facego/gen/teachers/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) CreateTeacher(
	ctx context.Context,
	req *connect.Request[teachersv1.CreateTeacherRequest],
) (*connect.Response[teachersv1.CreateTeacherResponse], error) {
	msg := req.Msg

	model := db_models.Teacher{
		Name:      msg.Name,
		TeacherID: msg.TeacherId,
		Subject:   msg.Subject,
		Email:     msg.Email,
		Phone:     msg.Phone,
	}
	if err := s.db.WithContext(ctx).Create(&model).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	teacher, err := s.fetchTeacher(ctx, int64(model.ID))
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&teachersv1.CreateTeacherResponse{Teacher: teacher}), nil
}
