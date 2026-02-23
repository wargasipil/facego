package user_service

import (
	"context"

	"connectrpc.com/connect"
	usersv1 "github.com/wargasipil/facego/gen/users/v1"
)

const defaultPageSize = 10

func (s *Service) ListUsers(
	ctx context.Context,
	req *connect.Request[usersv1.ListUsersRequest],
) (*connect.Response[usersv1.ListUsersResponse], error) {
	msg := req.Msg

	base := s.db.WithContext(ctx).
		Table("users u").
		Joins("LEFT JOIN study_programs sp ON sp.id = u.study_program_id").
		Joins("LEFT JOIN grades g ON g.id = u.grade_id")

	if f := msg.Filter; f != nil {
		if f.ClassId > 0 {
			base = base.Where(
				`EXISTS (SELECT 1 FROM class_enrollments ce
				         WHERE ce.user_id = u.id AND ce.class_id = ?)`, f.ClassId)
		}
		if f.Search != "" {
			like := "%" + f.Search + "%"
			base = base.Where("u.name ILIKE ? OR u.student_id ILIKE ?", like, like)
		}
	}

	// COUNT total matching rows
	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Resolve page and page_size
	pageSize := int(msg.PageSize)
	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	page := int(msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	var rows []userRow
	if err := base.
		Select(userSelectSQL).
		Order("u.name").
		Limit(pageSize).
		Offset(offset).
		Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	users := make([]*usersv1.User, len(rows))
	for i, r := range rows {
		users[i] = r.toProto()
	}
	return connect.NewResponse(&usersv1.ListUsersResponse{
		Users: users,
		Total: int32(total),
	}), nil
}
