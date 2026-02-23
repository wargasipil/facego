package class_service

import (
	"context"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
)

func (s *Service) GetClass(
	ctx context.Context,
	req *connect.Request[classesv1.GetClassRequest],
) (*connect.Response[classesv1.GetClassResponse], error) {
	class, err := s.fetchClass(ctx, req.Msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&classesv1.GetClassResponse{Class: class}), nil
}
