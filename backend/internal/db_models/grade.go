package db_models

import "time"

// Grade is the GORM model for the grades table.
type Grade struct {
	ID          uint      `gorm:"primaryKey;column:id;autoIncrement"`
	Level       string    `gorm:"column:level;not null;uniqueIndex"`
	Label       string    `gorm:"column:label;not null"`
	Description string    `gorm:"column:description;not null;default:''"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (Grade) TableName() string { return "grades" }
