package notifier_service

import (
	"context"

	"connectrpc.com/connect"
	notifiersv1 "github.com/wargasipil/facego/gen/notifiers/v1"
)

func (s *Service) NotifyParent(
	ctx context.Context,
	req *connect.Request[notifiersv1.NotifyParentRequest],
) (*connect.Response[notifiersv1.NotifyParentResponse], error) {
	// TODO: implement
	return connect.NewResponse(&notifiersv1.NotifyParentResponse{}), nil
}
