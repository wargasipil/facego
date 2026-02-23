package study_program_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	studyprogramsv1 "github.com/wargasipil/facego/gen/study_programs/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) UpdateStudyProgram(
	ctx context.Context,
	req *connect.Request[studyprogramsv1.UpdateStudyProgramRequest],
) (*connect.Response[studyprogramsv1.UpdateStudyProgramResponse], error) {
	msg := req.Msg
	result := s.db.WithContext(ctx).
		Model(&db_models.StudyProgram{}).
		Where("id = ?", msg.Id).
		Updates(map[string]any{
			"name":        msg.Name,
			"code":        msg.Code,
			"description": msg.Description,
		})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("study program not found"))
	}
	sp, err := s.fetchStudyProgram(ctx, msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&studyprogramsv1.UpdateStudyProgramResponse{StudyProgram: sp}), nil
}
