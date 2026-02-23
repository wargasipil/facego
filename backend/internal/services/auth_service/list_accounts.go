package auth_service

import (
	"context"

	"connectrpc.com/connect"
	authv1 "github.com/wargasipil/facego/gen/auth/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) ListAccounts(
	ctx context.Context,
	req *connect.Request[authv1.ListAccountsRequest],
) (*connect.Response[authv1.ListAccountsResponse], error) {
	var accounts []db_models.Account
	if err := s.db.WithContext(ctx).Order("id").Find(&accounts).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	proto := make([]*authv1.Account, len(accounts))
	for i, a := range accounts {
		a := a
		proto[i] = toProtoAccount(&a)
	}
	return connect.NewResponse(&authv1.ListAccountsResponse{Accounts: proto}), nil
}
