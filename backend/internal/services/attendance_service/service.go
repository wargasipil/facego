package attendance_service

import (
	"time"

	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	"gorm.io/gorm"
)

// attendanceRow is used to scan join results (attendances + users).
type attendanceRow struct {
	ID              int64                         `gorm:"column:id"`
	UserID          int64                         `gorm:"column:user_id"`
	Name            string                        `gorm:"column:name"`
	StudentID       string                        `gorm:"column:student_id"`
	ClassName       string                        `gorm:"column:class_name"`
	PhotoURL        string                        `gorm:"column:photo_url"`
	Status          attendancev1.AttendanceStatus `gorm:"column:status"`
	CheckInTime     time.Time                     `gorm:"column:check_in_time"`
	LastSeen        time.Time                     `gorm:"column:last_seen"`
	Notes           string                        `gorm:"column:notes"`
	ClassScheduleID int64                         `gorm:"column:class_schedule_id"`
}

// attendanceJoinSQL is used for single-record lookups (create, list).
// Class name comes directly from attendances.class_id — not through enrollments,
// because the class on an attendance record is the session class, independent of
// the student's current enrollment (which is a separate many-to-many relation).
const attendanceJoinSQL = `
SELECT
    a.id,
    a.user_id,
    u.name,
    u.student_id,
    COALESCE(c.name, '') AS class_name,
    u.photo_url,
    a.status,
    a.check_in_time,
    a.check_in_time AS last_seen,
    a.notes,
    COALESCE(a.class_schedule_id, 0) AS class_schedule_id
FROM attendances a
JOIN users u ON u.id = a.user_id
LEFT JOIN classes c ON c.id = a.class_id
`

// dailyAttendanceSQL returns one row per student for the day.
// Uses window functions to compute first_seen (MIN) and last_seen (MAX).
const dailyAttendanceSQL = `
SELECT DISTINCT ON (a.user_id)
    a.id,
    a.user_id,
    u.name,
    u.student_id,
    COALESCE(c.name, '') AS class_name,
    u.photo_url,
    a.status,
    MIN(a.check_in_time) OVER (PARTITION BY a.user_id) AS check_in_time,
    MAX(a.check_in_time) OVER (PARTITION BY a.user_id) AS last_seen,
    a.notes,
    COALESCE(a.class_schedule_id, 0) AS class_schedule_id
FROM attendances a
JOIN users u ON u.id = a.user_id
LEFT JOIN classes c ON c.id = a.class_id
`

// Service implements attendancev1connect.AttendanceServiceHandler.
type Service struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Service {
	return &Service{db: db}
}
