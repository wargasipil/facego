package auth_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	authv1 "github.com/wargasipil/facego/gen/auth/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func (s *Service) UpdateAccount(
	ctx context.Context,
	req *connect.Request[authv1.UpdateAccountRequest],
) (*connect.Response[authv1.UpdateAccountResponse], error) {
	var account db_models.Account
	if err := s.db.WithContext(ctx).First(&account, req.Msg.Id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("account not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	updates := map[string]any{
		"display_name": req.Msg.DisplayName,
		"role":         roleFromProto(req.Msg.Role),
	}
	if req.Msg.NewPassword != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Msg.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, err)
		}
		updates["password_hash"] = string(hash)
	}

	if err := s.db.WithContext(ctx).Model(&account).Updates(updates).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&authv1.UpdateAccountResponse{
		Account: toProtoAccount(&account),
	}), nil
}
