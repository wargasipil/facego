package db_models

import "time"

// Class is the GORM model for the classes table.
type Class struct {
	ID          uint      `gorm:"primaryKey;column:id;autoIncrement"`
	Name        string    `gorm:"column:name;not null;uniqueIndex"`
	GradeID     uint      `gorm:"column:grade_id;not null;index"`
	Grade       Grade     `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
	TeacherID   uint      `gorm:"column:teacher_id;not null;index"`
	Teacher     Teacher   `gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
	Description     string       `gorm:"column:description;not null;default:''"`
	StudyProgramID  *uint        `gorm:"column:study_program_id;index"`
	StudyProgram    StudyProgram `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL"`
	CreatedAt       time.Time    `gorm:"column:created_at;autoCreateTime"`
}

func (Class) TableName() string { return "classes" }
