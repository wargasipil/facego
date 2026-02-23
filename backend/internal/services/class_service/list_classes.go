package class_service

import (
	"context"
	"fmt"
	"strings"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
)

const classCountBaseSQL = `
SELECT COUNT(DISTINCT c.id)
FROM classes c
LEFT JOIN grades   g ON g.id = c.grade_id
LEFT JOIN teachers t ON t.id = c.teacher_id
`

const defaultClassPageSize = 10

func (s *Service) ListClasses(
	ctx context.Context,
	req *connect.Request[classesv1.ListClassesRequest],
) (*connect.Response[classesv1.ListClassesResponse], error) {
	msg := req.Msg

	var conditions []string
	var args []any

	if msg.GradeIdFilter > 0 {
		conditions = append(conditions, "c.grade_id = ?")
		args = append(args, msg.GradeIdFilter)
	}
	if msg.Search != "" {
		conditions = append(conditions, "(c.name ILIKE ? OR t.name ILIKE ? OR g.level ILIKE ?)")
		like := "%" + msg.Search + "%"
		args = append(args, like, like, like)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ") + " "
	}

	// COUNT
	var total int64
	if err := s.db.WithContext(ctx).Raw(classCountBaseSQL+whereClause, args...).Scan(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Pagination
	pageSize := int(msg.PageSize)
	if pageSize <= 0 {
		pageSize = defaultClassPageSize
	}
	page := int(msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	// Data query
	dataQuery := classWithCountSQL + whereClause + classGroupBy +
		fmt.Sprintf("LIMIT %d OFFSET %d", pageSize, offset)

	var rows []classRow
	if err := s.db.WithContext(ctx).Raw(dataQuery, args...).Scan(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	classes := make([]*classesv1.Class, len(rows))
	for i, r := range rows {
		classes[i] = r.toProto()
	}
	return connect.NewResponse(&classesv1.ListClassesResponse{
		Classes: classes,
		Total:   int32(total),
	}), nil
}
