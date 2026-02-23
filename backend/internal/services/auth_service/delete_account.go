package auth_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	authv1 "github.com/wargasipil/facego/gen/auth/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) DeleteAccount(
	ctx context.Context,
	req *connect.Request[authv1.DeleteAccountRequest],
) (*connect.Response[authv1.DeleteAccountResponse], error) {
	result := s.db.WithContext(ctx).
		Where("id = ?", req.Msg.Id).
		Delete(&db_models.Account{})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("account not found"))
	}
	return connect.NewResponse(&authv1.DeleteAccountResponse{}), nil
}
