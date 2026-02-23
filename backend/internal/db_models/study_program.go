package db_models

import "time"

// StudyProgram is the GORM model for the study_programs table.
type StudyProgram struct {
	ID          uint      `gorm:"primaryKey;column:id;autoIncrement"`
	Name        string    `gorm:"column:name;not null"`
	Code        string    `gorm:"column:code;not null;default:''"`
	Description string    `gorm:"column:description;not null;default:''"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (StudyProgram) TableName() string { return "study_programs" }
