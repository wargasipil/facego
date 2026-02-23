package teacher_service

import (
	"context"

	"connectrpc.com/connect"
	teachersv1 "github.com/wargasipil/facego/gen/teachers/v1"
)

func (s *Service) ListTeachers(
	ctx context.Context,
	req *connect.Request[teachersv1.ListTeachersRequest],
) (*connect.Response[teachersv1.ListTeachersResponse], error) {
	var rows []teacherRow

	query := teacherWithCountSQL
	var args []any

	if q := req.Msg.Search; q != "" {
		query += `WHERE t.name ILIKE ? OR t.teacher_id ILIKE ? OR t.subject ILIKE ? `
		like := "%" + q + "%"
		args = append(args, like, like, like)
	}
	query += teacherGroupBy

	result := s.db.WithContext(ctx).Raw(query, args...).Scan(&rows)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}

	teachers := make([]*teachersv1.Teacher, len(rows))
	for i, r := range rows {
		teachers[i] = r.toProto()
	}
	return connect.NewResponse(&teachersv1.ListTeachersResponse{Teachers: teachers}), nil
}
