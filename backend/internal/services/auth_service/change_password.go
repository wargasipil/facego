package auth_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	authv1 "github.com/wargasipil/facego/gen/auth/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"github.com/wargasipil/facego/internal/interceptors"
	"golang.org/x/crypto/bcrypt"
)

func (s *Service) ChangePassword(
	ctx context.Context,
	req *connect.Request[authv1.ChangePasswordRequest],
) (*connect.Response[authv1.ChangePasswordResponse], error) {
	accountID, ok := interceptors.AccountIDFromContext(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, errors.New("not authenticated"))
	}

	var account db_models.Account
	if err := s.db.WithContext(ctx).First(&account, accountID).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(req.Msg.CurrentPassword)); err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("current password is incorrect"))
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Msg.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	if err := s.db.WithContext(ctx).Model(&account).Update("password_hash", string(hash)).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&authv1.ChangePasswordResponse{}), nil
}
