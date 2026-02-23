package study_program_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	studyprogramsv1 "github.com/wargasipil/facego/gen/study_programs/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

// studyProgramRow scans results with computed class/student counts.
type studyProgramRow struct {
	ID           int64     `gorm:"column:id"`
	Name         string    `gorm:"column:name"`
	Code         string    `gorm:"column:code"`
	Description  string    `gorm:"column:description"`
	CreatedAt    time.Time `gorm:"column:created_at"`
	ClassCount   int32     `gorm:"column:class_count"`
	StudentCount int32     `gorm:"column:student_count"`
}

func (r studyProgramRow) toProto() *studyprogramsv1.StudyProgram {
	return &studyprogramsv1.StudyProgram{
		Id:           r.ID,
		Name:         r.Name,
		Code:         r.Code,
		Description:  r.Description,
		ClassCount:   r.ClassCount,
		StudentCount: r.StudentCount,
		CreatedAt:    timestamppb.New(r.CreatedAt),
	}
}

const studyProgramWithCountsSQL = `
SELECT
    sp.id,
    sp.name,
    sp.code,
    sp.description,
    sp.created_at,
    COUNT(DISTINCT c.id)::int AS class_count,
    COUNT(DISTINCT u.id)::int AS student_count
FROM study_programs sp
LEFT JOIN classes c ON c.study_program_id = sp.id
LEFT JOIN users   u ON u.study_program_id = sp.id
`

const studyProgramGroupBy = `
GROUP BY sp.id, sp.name, sp.code, sp.description, sp.created_at
ORDER BY sp.name
`

// Service implements studyprogramsv1connect.StudyProgramServiceHandler.
type Service struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Service {
	return &Service{db: db}
}

// fetchStudyProgram retrieves one study program by ID with computed counts.
func (s *Service) fetchStudyProgram(ctx context.Context, id int64) (*studyprogramsv1.StudyProgram, error) {
	var row studyProgramRow
	result := s.db.WithContext(ctx).
		Raw(studyProgramWithCountsSQL+`WHERE sp.id = ?`+studyProgramGroupBy, id).
		Scan(&row)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("study program not found"))
	}
	return row.toProto(), nil
}
