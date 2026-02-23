package class_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) UpdateClass(
	ctx context.Context,
	req *connect.Request[classesv1.UpdateClassRequest],
) (*connect.Response[classesv1.UpdateClassResponse], error) {
	msg := req.Msg

	var studyProgramID any
	if msg.StudyProgramId > 0 {
		studyProgramID = uint(msg.StudyProgramId)
	} // nil = SET NULL

	result := s.db.WithContext(ctx).
		Model(&db_models.Class{}).
		Where("id = ?", msg.Id).
		Updates(map[string]any{
			"name":             msg.Name,
			"grade_id":         msg.GradeId,
			"teacher_id":       msg.TeacherId,
			"description":      msg.Description,
			"study_program_id": studyProgramID,
		})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("class not found"))
	}

	class, err := s.fetchClass(ctx, msg.Id)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&classesv1.UpdateClassResponse{Class: class}), nil
}
