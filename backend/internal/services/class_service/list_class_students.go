package class_service

import (
	"context"
	"time"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	usersv1 "github.com/wargasipil/facego/gen/users/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

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
	var rows []studentRow
	if err := s.db.WithContext(ctx).
		Table("users u").
		Select(`u.id, u.student_id, u.name, u.email, u.photo_url,
			u.registered_at, u.parent_name, u.parent_phone, u.parent_email,
			COALESCE((SELECT STRING_AGG(c2.name, ', ' ORDER BY c2.name)
			           FROM class_enrollments ce2 JOIN classes c2 ON c2.id = ce2.class_id
			           WHERE ce2.user_id = u.id), '') AS class_name`).
		Joins("JOIN class_enrollments ce ON ce.user_id = u.id").
		Where("ce.class_id = ?", req.Msg.Id).
		Order("u.name").
		Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	students := make([]*usersv1.User, len(rows))
	for i, r := range rows {
		students[i] = r.toProto()
	}
	return connect.NewResponse(&classesv1.ListClassStudentsResponse{Students: students}), nil
}
