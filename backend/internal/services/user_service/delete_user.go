package user_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	usersv1 "github.com/wargasipil/facego/gen/users/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) DeleteUser(
	ctx context.Context,
	req *connect.Request[usersv1.DeleteUserRequest],
) (*connect.Response[usersv1.DeleteUserResponse], error) {
	result := s.db.WithContext(ctx).
		Where("id = ?", req.Msg.Id).
		Delete(&db_models.User{})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("user not found"))
	}
	return connect.NewResponse(&usersv1.DeleteUserResponse{}), nil
}
