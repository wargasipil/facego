package db_models

import "time"

type Attendance struct {
	ID          int64     `gorm:"primaryKey;column:id;autoIncrement"`
	UserID      int64     `gorm:"column:user_id;not null;index"`
	ClassID         *int64    `gorm:"column:class_id;index"`
	ClassScheduleID *int64    `gorm:"column:class_schedule_id;index"`
	Status      string    `gorm:"column:status;not null"`
	CheckInTime time.Time `gorm:"column:check_in_time;not null;index"`
	Notes       string    `gorm:"column:notes;not null;default:''"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (Attendance) TableName() string { return "attendances" }
