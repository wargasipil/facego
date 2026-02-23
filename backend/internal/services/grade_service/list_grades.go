package grade_service

import (
	"context"

	"connectrpc.com/connect"
	gradesv1 "github.com/wargasipil/facego/gen/grades/v1"
)

func (s *Service) ListGrades(
	ctx context.Context,
	_ *connect.Request[gradesv1.ListGradesRequest],
) (*connect.Response[gradesv1.ListGradesResponse], error) {
	var rows []gradeRow
	result := s.db.WithContext(ctx).
		Raw(gradeWithCountsSQL + gradeGroupBy).
		Scan(&rows)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}

	grades := make([]*gradesv1.Grade, len(rows))
	for i, r := range rows {
		grades[i] = r.toProto()
	}
	return connect.NewResponse(&gradesv1.ListGradesResponse{Grades: grades}), nil
}
