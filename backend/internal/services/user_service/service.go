package user_service

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"connectrpc.com/connect"
	usersv1 "github.com/wargasipil/facego/gen/users/v1"
	usersv1connect "github.com/wargasipil/facego/gen/users/v1/usersv1connect"
	"github.com/wargasipil/facego/internal/configs"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

// userRow scans users + aggregated enrollment results.
type userRow struct {
	ID               int64     `gorm:"column:id"`
	StudentID        string    `gorm:"column:student_id"`
	Name             string    `gorm:"column:name"`
	ClassName        string    `gorm:"column:class_name"` // comma-separated from subquery
	Email            string    `gorm:"column:email"`
	PhotoURL         string    `gorm:"column:photo_url"`
	RegisteredAt     time.Time `gorm:"column:registered_at"`
	ParentName       string    `gorm:"column:parent_name"`
	ParentPhone      string    `gorm:"column:parent_phone"`
	ParentEmail      string    `gorm:"column:parent_email"`
	StudyProgramID   *int64    `gorm:"column:study_program_id"`
	StudyProgramName string    `gorm:"column:study_program_name"`
	GradeID          *int64    `gorm:"column:grade_id"`
	GradeLabel       string    `gorm:"column:grade_label"`
}

func (r userRow) toProto() *usersv1.User {
	var studyProgramID int64
	if r.StudyProgramID != nil {
		studyProgramID = *r.StudyProgramID
	}
	var gradeID int64
	if r.GradeID != nil {
		gradeID = *r.GradeID
	}
	return &usersv1.User{
		Id:               r.ID,
		Name:             r.Name,
		StudentId:        r.StudentID,
		ClassName:        r.ClassName,
		Email:            r.Email,
		PhotoUrl:         r.PhotoURL,
		RegisteredAt:     timestamppb.New(r.RegisteredAt),
		ParentName:       r.ParentName,
		ParentPhone:      r.ParentPhone,
		ParentEmail:      r.ParentEmail,
		StudyProgramId:   studyProgramID,
		StudyProgramName: r.StudyProgramName,
		GradeId:          gradeID,
		GradeLabel:       r.GradeLabel,
	}
}

// userSelectSQL is the base SELECT; class_name is aggregated from class_enrollments.
const userSelectSQL = `u.id, u.student_id, u.name,
	COALESCE((SELECT STRING_AGG(c2.name, ', ' ORDER BY c2.name)
	           FROM class_enrollments ce2 JOIN classes c2 ON c2.id = ce2.class_id
	           WHERE ce2.user_id = u.id), '') AS class_name,
	u.email, u.photo_url, u.registered_at, u.parent_name, u.parent_phone, u.parent_email,
	u.study_program_id, COALESCE(sp.name, '') AS study_program_name,
	u.grade_id, COALESCE(g.label, '') AS grade_label`

// Service implements usersv1connect.UserServiceHandler.
type Service struct {
	db         *gorm.DB
	uploadsDir string
}

func NewService(db *gorm.DB, cfg *configs.AppConfig) usersv1connect.UserServiceHandler {
	return &Service{db: db, uploadsDir: cfg.Storage.UploadsDir}
}

// fetchUser retrieves one user by ID with class name via JOIN.
func (s *Service) fetchUser(ctx context.Context, id int64) (*usersv1.User, error) {
	var row userRow
	result := s.db.WithContext(ctx).
		Table("users u").
		Select(userSelectSQL).
		Joins("LEFT JOIN study_programs sp ON sp.id = u.study_program_id").
		Joins("LEFT JOIN grades g ON g.id = u.grade_id").
		Where("u.id = ?", id).
		First(&row)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, errors.New("user not found"))
		}
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	return row.toProto(), nil
}

// saveFaceImage writes image bytes to uploads/faces/<studentID>.jpg and returns
// the public URL path. Returns an empty string if uploadsDir is not configured.
func (s *Service) saveFaceImage(studentID string, data []byte) (string, error) {
	if s.uploadsDir == "" {
		return "", nil
	}
	dir := filepath.Join(s.uploadsDir, "faces")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("create uploads dir: %w", err)
	}
	filename := studentID + ".jpg"
	if err := os.WriteFile(filepath.Join(dir, filename), data, 0o644); err != nil {
		return "", fmt.Errorf("write face image: %w", err)
	}
	return "/uploads/faces/" + filename, nil
}
