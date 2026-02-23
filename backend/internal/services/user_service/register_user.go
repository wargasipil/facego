package user_service

import (
	"context"

	"connectrpc.com/connect"
	usersv1 "github.com/wargasipil/facego/gen/users/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) RegisterUser(
	ctx context.Context,
	req *connect.Request[usersv1.RegisterUserRequest],
) (*connect.Response[usersv1.RegisterUserResponse], error) {
	msg := req.Msg

	model := db_models.User{
		StudentID:   msg.StudentId,
		Name:        msg.Name,
		Email:       msg.Email,
		ParentName:  msg.ParentName,
		ParentPhone: msg.ParentPhone,
		ParentEmail: msg.ParentEmail,
	}
	if msg.StudyProgramId > 0 {
		spID := uint(msg.StudyProgramId)
		model.StudyProgramID = &spID
	}
	if msg.GradeId > 0 {
		gID := uint(msg.GradeId)
		model.GradeID = &gID
	}

	if len(msg.FaceImage) > 0 {
		photoURL, err := s.saveFaceImage(msg.StudentId, msg.FaceImage)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		model.PhotoURL = photoURL
	}

	if err := s.db.WithContext(ctx).Create(&model).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	user, err := s.fetchUser(ctx, int64(model.ID))
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&usersv1.RegisterUserResponse{User: user}), nil
}
