package study_program_service

import (
	"context"

	"connectrpc.com/connect"
	studyprogramsv1 "github.com/wargasipil/facego/gen/study_programs/v1"
	studyprogramsv1connect "github.com/wargasipil/facego/gen/study_programs/v1/study_programsv1connect"
)

var _ studyprogramsv1connect.StudyProgramServiceHandler = (*Service)(nil)

func (s *Service) ListStudyPrograms(
	ctx context.Context,
	_ *connect.Request[studyprogramsv1.ListStudyProgramsRequest],
) (*connect.Response[studyprogramsv1.ListStudyProgramsResponse], error) {
	var rows []studyProgramRow
	result := s.db.WithContext(ctx).
		Raw(studyProgramWithCountsSQL + studyProgramGroupBy).
		Scan(&rows)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	programs := make([]*studyprogramsv1.StudyProgram, len(rows))
	for i, r := range rows {
		programs[i] = r.toProto()
	}
	return connect.NewResponse(&studyprogramsv1.ListStudyProgramsResponse{StudyPrograms: programs}), nil
}
