package whatsapp_service

import (
	"context"

	"connectrpc.com/connect"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
)

// WStream streams WhatsApp events to the frontend.
// Immediately sends current state (QR or connected), then blocks forwarding
// new events until the client disconnects.
func (s *Service) WStream(
	ctx context.Context,
	req *connect.Request[whatsappv1.WStreamRequest],
	stream *connect.ServerStream[whatsappv1.WStreamResponse],
) error {
	ch := s.subscribe()
	defer s.unsubscribe(ch)

	// Send current state immediately to the new subscriber
	s.mu.RLock()
	qr := s.lastQR
	s.mu.RUnlock()

	if s.wa.IsConnected() && s.wa.Store.ID != nil {
		if err := stream.Send(&whatsappv1.WStreamResponse{
			E: &whatsappv1.WStreamResponse_SyncCompleted{SyncCompleted: true},
		}); err != nil {
			return err
		}
	} else if qr != "" {
		if err := stream.Send(&whatsappv1.WStreamResponse{
			E: &whatsappv1.WStreamResponse_NeedLogin{
				NeedLogin: &whatsappv1.NeedLogin{Code: qr},
			},
		}); err != nil {
			return err
		}
	}

	// Block and forward events
	for {
		select {
		case evt := <-ch:
			var msg *whatsappv1.WStreamResponse
			if evt.QRCode != "" {
				msg = &whatsappv1.WStreamResponse{
					E: &whatsappv1.WStreamResponse_NeedLogin{
						NeedLogin: &whatsappv1.NeedLogin{Code: evt.QRCode},
					},
				}
			} else if evt.SyncCompleted {
				msg = &whatsappv1.WStreamResponse{
					E: &whatsappv1.WStreamResponse_SyncCompleted{SyncCompleted: true},
				}
			}
			if msg != nil {
				if err := stream.Send(msg); err != nil {
					return err
				}
			}
		case <-ctx.Done():
			return nil
		}
	}
}
