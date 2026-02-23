package teacher_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	teachersv1 "github.com/wargasipil/facego/gen/teachers/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) UpdateTeacher(
	ctx context.Context,
	req *connect.Request[teachersv1.UpdateTeacherRequest],
) (*connect.Response[teachersv1.UpdateTeacherResponse], error) {
	msg := req.Msg

	result := s.db.WithContext(ctx).
		Model(&db_models.Teacher{}).
		Where("id = ?", msg.Id).
		Updates(map[string]any{
			"name":       msg.Name,
			"teacher_id": msg.TeacherId,
			"subject":    msg.Subject,
			"email":      msg.Email,
			"phone":      msg.Phone,
		})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("teacher not found"))
	}

	teacher, err := s.fetchTeacher(ctx, msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&teachersv1.UpdateTeacherResponse{Teacher: teacher}), nil
}
