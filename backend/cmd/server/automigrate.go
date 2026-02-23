package main

import (
	"context"
	"log/slog"

	"github.com/urfave/cli/v3"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"golang.org/x/crypto/bcrypt"
)

func automigrate(ctx context.Context, cmd *cli.Command) error {
	cfg, db, err := loadDB(cmd)
	if err != nil {
		return err
	}

	// Drop legacy columns that were replaced by FK relations.
	// AutoMigrate never removes columns, so we do it manually (idempotent).
	db.Exec(`ALTER TABLE users DROP COLUMN IF EXISTS class_name`)

	slog.Info("running AutoMigrate...")
	if err := db.AutoMigrate(
		&db_models.Grade{},
		&db_models.StudyProgram{},
		&db_models.Class{},
		&db_models.User{},
		&db_models.Teacher{},
		&db_models.Account{},
		&db_models.Attendance{},
		&db_models.WhatsappMessage{},
		&db_models.WhatsappConfig{},
		&db_models.ClassSchedule{},
		&db_models.ClassEnrollment{},
	); err != nil {
		return err
	}

	// Migrate existing class assignments from users.class_id → class_enrollments.
	db.Exec(`
		INSERT INTO class_enrollments (class_id, user_id)
		SELECT class_id, id FROM users
		WHERE class_id IS NOT NULL
		ON CONFLICT DO NOTHING
	`)

	// Drop the now-redundant users.class_id column (idempotent).
	db.Exec(`ALTER TABLE users DROP COLUMN IF EXISTS class_id`)

	// Seed initial admin account if none exists
	var count int64
	db.Model(&db_models.Account{}).Count(&count)
	if count == 0 {
		seedPwd := cfg.Auth.AdminSeedPwd
		if seedPwd == "" {
			seedPwd = "admin123"
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(seedPwd), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		admin := db_models.Account{
			Username:     "admin",
			DisplayName:  "Administrator",
			PasswordHash: string(hash),
			Role:         "admin",
		}
		if err := db.Create(&admin).Error; err != nil {
			slog.Warn("seed admin already exists (skipping)", "err", err)
		} else {
			slog.Info("seeded initial admin account", "username", "admin")
		}
	}

	slog.Info("AutoMigrate completed successfully")
	return nil
}
