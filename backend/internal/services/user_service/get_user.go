package user_service

import (
	"context"

	"connectrpc.com/connect"
	usersv1 "github.com/wargasipil/facego/gen/users/v1"
)

func (s *Service) GetUser(
	ctx context.Context,
	req *connect.Request[usersv1.GetUserRequest],
) (*connect.Response[usersv1.GetUserResponse], error) {
	user, err := s.fetchUser(ctx, req.Msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&usersv1.GetUserResponse{User: user}), nil
}
