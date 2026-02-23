package grade_service

import (
	"context"

	"connectrpc.com/connect"
	gradesv1 "github.com/wargasipil/facego/gen/grades/v1"
)

func (s *Service) GetGrade(
	ctx context.Context,
	req *connect.Request[gradesv1.GetGradeRequest],
) (*connect.Response[gradesv1.GetGradeResponse], error) {
	grade, err := s.fetchGrade(ctx, req.Msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&gradesv1.GetGradeResponse{Grade: grade}), nil
}
