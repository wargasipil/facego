package class_service

import (
	"context"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
)

func (s *Service) ListClasses(
	ctx context.Context,
	req *connect.Request[classesv1.ListClassesRequest],
) (*connect.Response[classesv1.ListClassesResponse], error) {
	var rows []classRow

	query := classWithCountSQL
	var args []any

	if f := req.Msg.GradeIdFilter; f > 0 {
		query += `WHERE c.grade_id = ? `
		args = append(args, f)
	}
	query += classGroupBy

	result := s.db.WithContext(ctx).Raw(query, args...).Scan(&rows)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}

	classes := make([]*classesv1.Class, len(rows))
	for i, r := range rows {
		classes[i] = r.toProto()
	}
	return connect.NewResponse(&classesv1.ListClassesResponse{Classes: classes}), nil
}
