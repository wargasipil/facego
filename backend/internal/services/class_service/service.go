package class_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

const classWithCountSQL = `
SELECT
    c.id,
    c.name,
    c.grade_id,
    g.level          AS grade_level,
    g.label          AS grade_label,
    c.teacher_id,
    t.name           AS teacher_name,
    t.teacher_id     AS teacher_code,
    t.subject        AS teacher_subject,
    t.email          AS teacher_email,
    t.phone          AS teacher_phone,
    c.description,
    c.created_at,
    COUNT(DISTINCT ce.user_id)::int AS student_count,
    c.study_program_id,
    COALESCE(sp.name, '') AS study_program_name
FROM classes c
LEFT JOIN grades            g  ON g.id  = c.grade_id
LEFT JOIN teachers          t  ON t.id  = c.teacher_id
LEFT JOIN class_enrollments ce ON ce.class_id = c.id
LEFT JOIN study_programs    sp ON sp.id = c.study_program_id
`

const classGroupBy = `
GROUP BY c.id, c.name, c.grade_id, g.level, g.label,
         c.teacher_id, t.name, t.teacher_id, t.subject, t.email, t.phone,
         c.description, c.created_at, c.study_program_id, sp.name
ORDER BY c.grade_id, c.name
`

// classRow is used to scan raw query results that include the computed student count.
type classRow struct {
	ID               int64     `gorm:"column:id"`
	Name             string    `gorm:"column:name"`
	GradeID          int64     `gorm:"column:grade_id"`
	GradeLevel       string    `gorm:"column:grade_level"`
	GradeLabel       string    `gorm:"column:grade_label"`
	TeacherID        int64     `gorm:"column:teacher_id"`
	TeacherName      string    `gorm:"column:teacher_name"`
	TeacherCode      string    `gorm:"column:teacher_code"`
	TeacherSubject   string    `gorm:"column:teacher_subject"`
	TeacherEmail     string    `gorm:"column:teacher_email"`
	TeacherPhone     string    `gorm:"column:teacher_phone"`
	Description      string    `gorm:"column:description"`
	CreatedAt        time.Time `gorm:"column:created_at"`
	StudentCount     int32     `gorm:"column:student_count"`
	StudyProgramID   *int64    `gorm:"column:study_program_id"`
	StudyProgramName string    `gorm:"column:study_program_name"`
}

func (r classRow) toProto() *classesv1.Class {
	var studyProgramID int64
	if r.StudyProgramID != nil {
		studyProgramID = *r.StudyProgramID
	}
	return &classesv1.Class{
		Id:   r.ID,
		Name: r.Name,
		Grade: &classesv1.Grade{
			Id:    r.GradeID,
			Level: r.GradeLevel,
			Label: r.GradeLabel,
		},
		Teacher: &classesv1.Teacher{
			Id:        r.TeacherID,
			Name:      r.TeacherName,
			TeacherId: r.TeacherCode,
			Subject:   r.TeacherSubject,
			Email:     r.TeacherEmail,
			Phone:     r.TeacherPhone,
		},
		GradeId:          r.GradeID,
		TeacherId:        r.TeacherID,
		Description:      r.Description,
		StudentCount:     r.StudentCount,
		CreatedAt:        timestamppb.New(r.CreatedAt),
		StudyProgramId:   studyProgramID,
		StudyProgramName: r.StudyProgramName,
	}
}

// Service implements classesv1connect.ClassServiceHandler.
type Service struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Service {
	return &Service{db: db}
}

// scheduleToProto converts a DB ClassSchedule model to its proto representation.
func scheduleToProto(m db_models.ClassSchedule) *classesv1.ClassSchedule {
	return &classesv1.ClassSchedule{
		Id:        int64(m.ID),
		ClassId:   int64(m.ClassID),
		DayOfWeek: m.DayOfWeek,
		StartTime: m.StartTime,
		EndTime:   m.EndTime,
		Subject:   m.Subject,
		Room:      m.Room,
	}
}

// fetchClass retrieves one class by ID together with its student count.
func (s *Service) fetchClass(ctx context.Context, id int64) (*classesv1.Class, error) {
	var row classRow
	result := s.db.WithContext(ctx).
		Raw(classWithCountSQL+`WHERE c.id = ?`+classGroupBy, id).
		Scan(&row)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("class not found"))
	}
	return row.toProto(), nil
}
