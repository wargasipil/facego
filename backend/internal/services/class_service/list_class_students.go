package class_service

import (
	"context"
	"time"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	usersv1 "github.com/wargasipil/facego/gen/users/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const defaultStudentPageSize = 10

type studentRow struct {
	ID           int64     `gorm:"column:id"`
	StudentID    string    `gorm:"column:student_id"`
	Name         string    `gorm:"column:name"`
	ClassName    string    `gorm:"column:class_name"`
	Email        string    `gorm:"column:email"`
	PhotoURL     string    `gorm:"column:photo_url"`
	RegisteredAt time.Time `gorm:"column:registered_at"`
	ParentName   string    `gorm:"column:parent_name"`
	ParentPhone  string    `gorm:"column:parent_phone"`
	ParentEmail  string    `gorm:"column:parent_email"`
}

func (r studentRow) toProto() *usersv1.User {
	return &usersv1.User{
		Id:           r.ID,
		Name:         r.Name,
		StudentId:    r.StudentID,
		ClassName:    r.ClassName,
		Email:        r.Email,
		PhotoUrl:     r.PhotoURL,
		RegisteredAt: timestamppb.New(r.RegisteredAt),
		ParentName:   r.ParentName,
		ParentPhone:  r.ParentPhone,
		ParentEmail:  r.ParentEmail,
	}
}

func (s *Service) ListClassStudents(
	ctx context.Context,
	req *connect.Request[classesv1.ListClassStudentsRequest],
) (*connect.Response[classesv1.ListClassStudentsResponse], error) {
	msg := req.Msg

	base := s.db.WithContext(ctx).
		Table("users u").
		Joins("JOIN class_enrollments ce ON ce.user_id = u.id").
		Where("ce.class_id = ?", msg.Id)

	if msg.Search != "" {
		like := "%" + msg.Search + "%"
		base = base.Where("(u.name ILIKE ? OR u.student_id ILIKE ?)", like, like)
	}

	// COUNT
	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Pagination
	pageSize := int(msg.PageSize)
	if pageSize <= 0 {
		pageSize = defaultStudentPageSize
	}
	page := int(msg.Page)
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * pageSize

	var rows []studentRow
	if err := base.
		Select(`u.id, u.student_id, u.name, u.email, u.photo_url,
			u.registered_at, u.parent_name, u.parent_phone, u.parent_email,
			COALESCE((SELECT STRING_AGG(c2.name, ', ' ORDER BY c2.name)
			           FROM class_enrollments ce2 JOIN classes c2 ON c2.id = ce2.class_id
			           WHERE ce2.user_id = u.id), '') AS class_name`).
		Order("u.name").
		Limit(pageSize).
		Offset(offset).
		Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	students := make([]*usersv1.User, len(rows))
	for i, r := range rows {
		students[i] = r.toProto()
	}
	return connect.NewResponse(&classesv1.ListClassStudentsResponse{
		Students: students,
		Total:    int32(total),
	}), nil
}
