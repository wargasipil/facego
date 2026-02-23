package whatsapp_service

import (
	"context"

	"connectrpc.com/connect"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) SaveConfig(
	ctx context.Context,
	req *connect.Request[whatsappv1.SaveConfigRequest],
) (*connect.Response[whatsappv1.SaveConfigResponse], error) {
	c := req.Msg.Config
	cfg := db_models.WhatsappConfig{
		ID:                    1, // single-row table
		Enabled:               c.Enabled,
		LateMessageTemplate:   c.LateMessageTemplate,
		AbsentMessageTemplate: c.AbsentMessageTemplate,
		SenderName:            c.SenderName,
	}
	if err := s.db.WithContext(ctx).Save(&cfg).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&whatsappv1.SaveConfigResponse{
		Config: configToProto(cfg),
	}), nil
}
