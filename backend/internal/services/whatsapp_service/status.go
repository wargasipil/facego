package whatsapp_service

import (
	"context"

	"connectrpc.com/connect"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	whatsappv1connect "github.com/wargasipil/facego/gen/whatsapp/v1/whatsappv1connect"
)

var _ whatsappv1connect.WhatsappServiceHandler = (*Service)(nil)

func (s *Service) Status(
	ctx context.Context,
	req *connect.Request[whatsappv1.StatusRequest],
) (*connect.Response[whatsappv1.StatusResponse], error) {
	connected := s.wa.IsConnected() && s.wa.Store.ID != nil

	phone := ""
	if connected {
		phone = s.wa.Store.ID.User
	}

	return connect.NewResponse(&whatsappv1.StatusResponse{
		Connected:   connected,
		PhoneNumber: phone,
	}), nil
}
