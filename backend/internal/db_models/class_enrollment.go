package db_models

import "time"

// ClassEnrollment is the junction table linking students to classes (many-to-many).
type ClassEnrollment struct {
	ID         uint      `gorm:"primaryKey;column:id;autoIncrement"`
	ClassID    uint      `gorm:"column:class_id;not null;uniqueIndex:idx_enrollment"`
	UserID     uint      `gorm:"column:user_id;not null;uniqueIndex:idx_enrollment"`
	Class      Class     `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	User       User      `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	EnrolledAt time.Time `gorm:"column:enrolled_at;autoCreateTime"`
}

func (ClassEnrollment) TableName() string { return "class_enrollments" }
