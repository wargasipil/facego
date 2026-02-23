package whatsapp_service

import (
	"context"
	"fmt"
	"strings"

	"connectrpc.com/connect"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	"google.golang.org/protobuf/proto"
)

func (s *Service) SendTestMessage(
	ctx context.Context,
	req *connect.Request[whatsappv1.SendTestMessageRequest],
) (*connect.Response[whatsappv1.SendTestMessageResponse], error) {
	if !s.wa.IsConnected() || s.wa.Store.ID == nil {
		return connect.NewResponse(&whatsappv1.SendTestMessageResponse{
			Success: false,
			Error:   "WhatsApp is not connected",
		}), nil
	}

	phone := strings.TrimPrefix(req.Msg.Phone, "+")
	jid, err := types.ParseJID(phone + "@s.whatsapp.net")
	if err != nil {
		return connect.NewResponse(&whatsappv1.SendTestMessageResponse{
			Success: false,
			Error:   fmt.Sprintf("invalid phone number: %v", err),
		}), nil
	}

	_, err = s.wa.SendMessage(ctx, jid, &waE2E.Message{
		Conversation: proto.String(req.Msg.Message),
	})
	if err != nil {
		return connect.NewResponse(&whatsappv1.SendTestMessageResponse{
			Success: false,
			Error:   err.Error(),
		}), nil
	}

	return connect.NewResponse(&whatsappv1.SendTestMessageResponse{Success: true}), nil
}
