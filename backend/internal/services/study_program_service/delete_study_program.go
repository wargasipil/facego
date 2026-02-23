package study_program_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	studyprogramsv1 "github.com/wargasipil/facego/gen/study_programs/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) DeleteStudyProgram(
	ctx context.Context,
	req *connect.Request[studyprogramsv1.DeleteStudyProgramRequest],
) (*connect.Response[studyprogramsv1.DeleteStudyProgramResponse], error) {
	result := s.db.WithContext(ctx).
		Where("id = ?", req.Msg.Id).
		Delete(&db_models.StudyProgram{})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("study program not found"))
	}
	return connect.NewResponse(&studyprogramsv1.DeleteStudyProgramResponse{}), nil
}
