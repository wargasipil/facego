package teacher_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	teachersv1 "github.com/wargasipil/facego/gen/teachers/v1"
	teachersv1connect "github.com/wargasipil/facego/gen/teachers/v1/teachersv1connect"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

// teacherWithCountSQL is the base SELECT that joins classes to compute class_count.
// Append an optional WHERE clause then teacherGroupBy.
const teacherWithCountSQL = `
SELECT
    t.id,
    t.name,
    t.teacher_id,
    t.subject,
    t.email,
    t.phone,
    t.created_at,
    COUNT(DISTINCT c.id)::int AS class_count
FROM teachers t
LEFT JOIN classes c ON c.teacher_id = t.id
`

const teacherGroupBy = `
GROUP BY t.id, t.name, t.teacher_id, t.subject, t.email, t.phone, t.created_at
ORDER BY t.name
`

// teacherRow is used to scan raw query results that include the computed class count.
type teacherRow struct {
	ID         int64     `gorm:"column:id"`
	Name       string    `gorm:"column:name"`
	TeacherID  string    `gorm:"column:teacher_id"`
	Subject    string    `gorm:"column:subject"`
	Email      string    `gorm:"column:email"`
	Phone      string    `gorm:"column:phone"`
	CreatedAt  time.Time `gorm:"column:created_at"`
	ClassCount int32     `gorm:"column:class_count"`
}

func (r teacherRow) toProto() *teachersv1.Teacher {
	return &teachersv1.Teacher{
		Id:         r.ID,
		Name:       r.Name,
		TeacherId:  r.TeacherID,
		Subject:    r.Subject,
		Email:      r.Email,
		Phone:      r.Phone,
		ClassCount: r.ClassCount,
		CreatedAt:  timestamppb.New(r.CreatedAt),
	}
}

// Service implements teachersv1connect.TeacherServiceHandler.
type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) teachersv1connect.TeacherServiceHandler {
	return &Service{db: db}
}

// fetchTeacher retrieves one teacher by ID together with its class count.
func (s *Service) fetchTeacher(ctx context.Context, id int64) (*teachersv1.Teacher, error) {
	var row teacherRow
	result := s.db.WithContext(ctx).
		Raw(teacherWithCountSQL+`WHERE t.id = ?`+teacherGroupBy, id).
		Scan(&row)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("teacher not found"))
	}
	return row.toProto(), nil
}
