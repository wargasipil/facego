package grade_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	gradesv1 "github.com/wargasipil/facego/gen/grades/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

// gradeWithCountsSQL is the base SELECT that joins classes and users to
// compute class_count and student_count. Append an optional WHERE clause
// then gradeGroupBy.
const gradeWithCountsSQL = `
SELECT
    g.id,
    g.level,
    g.label,
    g.description,
    g.created_at,
    COUNT(DISTINCT c.id)::int  AS class_count,
    COUNT(DISTINCT ce.user_id)::int AS student_count
FROM grades g
LEFT JOIN classes            c  ON c.grade_id   = g.id
LEFT JOIN class_enrollments  ce ON ce.class_id  = c.id
`

const gradeGroupBy = `
GROUP BY g.id, g.level, g.label, g.description, g.created_at
ORDER BY g.level
`

// gradeRow is used to scan raw query results that include computed counts.
type gradeRow struct {
	ID           int64     `gorm:"column:id"`
	Level        string    `gorm:"column:level"`
	Label        string    `gorm:"column:label"`
	Description  string    `gorm:"column:description"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	ClassCount   int32     `gorm:"column:class_count"`
	StudentCount int32     `gorm:"column:student_count"`
}

func (r gradeRow) toProto() *gradesv1.Grade {
	return &gradesv1.Grade{
		Id:           r.ID,
		Level:        r.Level,
		Label:        r.Label,
		Description:  r.Description,
		ClassCount:   r.ClassCount,
		StudentCount: r.StudentCount,
		CreatedAt:    timestamppb.New(r.CreatedAt),
	}
}

// Service implements gradesv1connect.GradeServiceHandler.
type Service struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Service {
	return &Service{db: db}
}

// fetchGrade retrieves one grade by ID together with its class/student counts.
func (s *Service) fetchGrade(ctx context.Context, id int64) (*gradesv1.Grade, error) {
	var row gradeRow
	result := s.db.WithContext(ctx).
		Raw(gradeWithCountsSQL+`WHERE g.id = ?`+gradeGroupBy, id).
		Scan(&row)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("grade not found"))
	}
	return row.toProto(), nil
}
