package db_models

import "time"

// Account is the GORM model for the accounts table (staff login credentials).
type Account struct {
	ID           uint      `gorm:"primaryKey;column:id;autoIncrement"`
	Username     string    `gorm:"column:username;not null;uniqueIndex"`
	DisplayName  string    `gorm:"column:display_name;not null"`
	PasswordHash string    `gorm:"column:password_hash;not null"`
	Role         string    `gorm:"column:role;not null;default:'operator'"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (Account) TableName() string { return "accounts" }
