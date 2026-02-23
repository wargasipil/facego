package whatsapp_service

import (
	"context"

	"connectrpc.com/connect"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) ListMessages(
	ctx context.Context,
	req *connect.Request[whatsappv1.ListMessagesRequest],
) (*connect.Response[whatsappv1.ListMessagesResponse], error) {
	q := s.db.WithContext(ctx).Model(&db_models.WhatsappMessage{}).Order("sent_at DESC")

	if req.Msg.From != nil {
		q = q.Where("sent_at >= ?", req.Msg.From.AsTime())
	}
	if req.Msg.To != nil {
		q = q.Where("sent_at < ?", req.Msg.To.AsTime())
	}

	var rows []db_models.WhatsappMessage
	if err := q.Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	msgs := make([]*whatsappv1.WhatsappMessage, 0, len(rows))
	for _, r := range rows {
		msgs = append(msgs, msgToProto(r))
	}
	return connect.NewResponse(&whatsappv1.ListMessagesResponse{Messages: msgs}), nil
}
