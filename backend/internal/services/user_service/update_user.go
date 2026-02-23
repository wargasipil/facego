package user_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	usersv1 "github.com/wargasipil/facego/gen/users/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) UpdateUser(
	ctx context.Context,
	req *connect.Request[usersv1.UpdateUserRequest],
) (*connect.Response[usersv1.UpdateUserResponse], error) {
	msg := req.Msg

	var studyProgramID any
	if msg.StudyProgramId > 0 {
		studyProgramID = uint(msg.StudyProgramId)
	}
	var gradeID any
	if msg.GradeId > 0 {
		gradeID = uint(msg.GradeId)
	}
	result := s.db.WithContext(ctx).
		Model(&db_models.User{}).
		Where("id = ?", msg.Id).
		Updates(map[string]any{
			"name":             msg.Name,
			"student_id":       msg.StudentId,
			"email":            msg.Email,
			"parent_name":      msg.ParentName,
			"parent_phone":     msg.ParentPhone,
			"parent_email":     msg.ParentEmail,
			"study_program_id": studyProgramID,
			"grade_id":         gradeID,
		})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("user not found"))
	}

	user, err := s.fetchUser(ctx, msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&usersv1.UpdateUserResponse{User: user}), nil
}
