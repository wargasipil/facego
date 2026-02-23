package auth_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	authv1 "github.com/wargasipil/facego/gen/auth/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"golang.org/x/crypto/bcrypt"
)

func (s *Service) CreateAccount(
	ctx context.Context,
	req *connect.Request[authv1.CreateAccountRequest],
) (*connect.Response[authv1.CreateAccountResponse], error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Msg.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	account := db_models.Account{
		Username:     req.Msg.Username,
		DisplayName:  req.Msg.DisplayName,
		PasswordHash: string(hash),
		Role:         roleFromProto(req.Msg.Role),
	}
	if err := s.db.WithContext(ctx).Create(&account).Error; err != nil {
		// username unique constraint
		return nil, connect.NewError(connect.CodeAlreadyExists, errors.New("username already taken"))
	}

	return connect.NewResponse(&authv1.CreateAccountResponse{
		Account: toProtoAccount(&account),
	}), nil
}
