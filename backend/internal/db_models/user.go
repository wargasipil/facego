package db_models

import "time"

// User is the GORM model for the users (students) table.
type User struct {
	ID           uint      `gorm:"primaryKey;column:id;autoIncrement"`
	StudentID    string    `gorm:"column:student_id;not null;uniqueIndex"`
	Name         string    `gorm:"column:name;not null"`
	Email        string    `gorm:"column:email"`
	PhotoURL     string    `gorm:"column:photo_url"`
	RegisteredAt time.Time `gorm:"column:registered_at;autoCreateTime"`
	ParentName      string       `gorm:"column:parent_name"`
	ParentPhone     string       `gorm:"column:parent_phone"`
	ParentEmail     string       `gorm:"column:parent_email"`
	StudyProgramID  *uint        `gorm:"column:study_program_id;index"`
	StudyProgram    StudyProgram `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL"`
	GradeID         *uint        `gorm:"column:grade_id;index"`
	Grade           Grade        `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL"`
}

func (User) TableName() string { return "users" }
