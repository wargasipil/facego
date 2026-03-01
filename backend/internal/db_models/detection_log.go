package db_models

import "time"

// DetectionLog stores every raw face-detection appearance event pushed from
// the Python client via AttendancePushLog. One row per appearance (i.e. each
// time a face enters the camera frame within a session).
type DetectionLog struct {
	ID          int64     `gorm:"primaryKey;column:id;autoIncrement"`
	SessionID   string    `gorm:"column:session_id;not null;index"`
	UserID      int64     `gorm:"column:user_id;index"` // 0 if face not linked to a user
	StudentID   string    `gorm:"column:student_id;not null"`
	StudentName string    `gorm:"column:student_name;not null;default:''"`
	ClassID         int64  `gorm:"column:class_id;index"`          // 0 if no class selected
	ClassName       string `gorm:"column:class_name;not null;default:''"`
	ClassScheduleID int64  `gorm:"column:class_schedule_id;index"` // 0 if no schedule slot matched
	SeenAt      time.Time `gorm:"column:seen_at;not null;index"`
	IsProcessed bool      `gorm:"column:is_processed;not null;default:false;index"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (DetectionLog) TableName() string { return "detection_logs" }
