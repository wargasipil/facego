package db_models

import (
	"time"

	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
)

type Attendance struct {
	ID              int64                         `gorm:"primaryKey;column:id;autoIncrement"`
	UserID          int64                         `gorm:"index:day_unique,unique"`
	ClassID         int64                         `gorm:"index:day_unique,unique"`
	ClassScheduleID int64                         `gorm:"index:day_unique,unique"`
	Day             time.Time                     `gorm:"index:day_unique,unique"`
	Status          attendancev1.AttendanceStatus `gorm:"column:status;not null"`
	CheckInTime     time.Time                     `gorm:"column:check_in_time;not null;index"`
	Notes           string                        `gorm:"column:notes;not null;default:''"`
	CreatedAt       time.Time                     `gorm:"column:created_at;autoCreateTime"`

	Class         Class
	ClassSchedule ClassSchedule
}

func (Attendance) TableName() string { return "attendances" }
