package study_program_service

import (
	"context"

	"connectrpc.com/connect"
	studyprogramsv1 "github.com/wargasipil/facego/gen/study_programs/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) CreateStudyProgram(
	ctx context.Context,
	req *connect.Request[studyprogramsv1.CreateStudyProgramRequest],
) (*connect.Response[studyprogramsv1.CreateStudyProgramResponse], error) {
	msg := req.Msg
	model := db_models.StudyProgram{
		Name:        msg.Name,
		Code:        msg.Code,
		Description: msg.Description,
	}
	if err := s.db.WithContext(ctx).Create(&model).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	sp, err := s.fetchStudyProgram(ctx, int64(model.ID))
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&studyprogramsv1.CreateStudyProgramResponse{StudyProgram: sp}), nil
}
