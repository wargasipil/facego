package whatsapp_service

import (
	"context"

	"connectrpc.com/connect"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) GetConfig(
	ctx context.Context,
	req *connect.Request[whatsappv1.GetConfigRequest],
) (*connect.Response[whatsappv1.GetConfigResponse], error) {
	var cfg db_models.WhatsappConfig
	res := s.db.WithContext(ctx).First(&cfg)
	if res.Error != nil {
		// No config yet — return defaults
		return connect.NewResponse(&whatsappv1.GetConfigResponse{
			Config: &whatsappv1.WhatsappConfig{
				Enabled:               true,
				LateMessageTemplate:   defaultLateTemplate,
				AbsentMessageTemplate: defaultAbsentTemplate,
				SenderName:            "FaceGo",
			},
		}), nil
	}
	// Fill in defaults if templates are empty
	if cfg.LateMessageTemplate == "" {
		cfg.LateMessageTemplate = defaultLateTemplate
	}
	if cfg.AbsentMessageTemplate == "" {
		cfg.AbsentMessageTemplate = defaultAbsentTemplate
	}
	return connect.NewResponse(&whatsappv1.GetConfigResponse{
		Config: configToProto(cfg),
	}), nil
}
