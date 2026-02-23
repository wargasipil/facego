package teacher_service

import (
	"context"

	"connectrpc.com/connect"
	teachersv1 "github.com/wargasipil/facego/gen/teachers/v1"
)

func (s *Service) GetTeacher(
	ctx context.Context,
	req *connect.Request[teachersv1.GetTeacherRequest],
) (*connect.Response[teachersv1.GetTeacherResponse], error) {
	teacher, err := s.fetchTeacher(ctx, req.Msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&teachersv1.GetTeacherResponse{Teacher: teacher}), nil
}
