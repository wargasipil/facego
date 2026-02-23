package study_program_service

import (
	"context"

	"connectrpc.com/connect"
	studyprogramsv1 "github.com/wargasipil/facego/gen/study_programs/v1"
)

func (s *Service) GetStudyProgram(
	ctx context.Context,
	req *connect.Request[studyprogramsv1.GetStudyProgramRequest],
) (*connect.Response[studyprogramsv1.GetStudyProgramResponse], error) {
	sp, err := s.fetchStudyProgram(ctx, req.Msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&studyprogramsv1.GetStudyProgramResponse{StudyProgram: sp}), nil
}
