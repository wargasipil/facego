package db_models

import "time"

type Teacher struct {
	ID        uint      `gorm:"primaryKey;column:id;autoIncrement"`
	Name      string    `gorm:"column:name;not null"`
	TeacherID string    `gorm:"column:teacher_id;not null;uniqueIndex"`
	Subject   string    `gorm:"column:subject;not null;default:''"`
	Email     string    `gorm:"column:email;not null;default:''"`
	Phone     string    `gorm:"column:phone;not null;default:''"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (Teacher) TableName() string { return "teachers" }
