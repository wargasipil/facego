package db_models

import "time"

// DetectionLog stores every raw face-detection appearance event pushed from
// the Python client via AttendancePushLog. One row per appearance (i.e. each
// time a face enters the camera frame within a session).
type DetectionLog struct {
	ID          int64     `gorm:"primaryKey;column:id;autoIncrement"`
	SessionID   string    `gorm:"column:session_id;not null;index"`
	UserID      int64     `gorm:"column:user_id;not null;index"`
	ClassID     int64     `gorm:"column:class_id;not null;index"`
	SeenAt      time.Time `gorm:"column:seen_at;not null;index"`
	IsProcessed bool      `gorm:"column:is_processed;not null;default:false;index"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime"`

	Class Class
	User  User
}

func (DetectionLog) TableName() string { return "detection_logs" }
