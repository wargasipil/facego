package main

import (
	"log/slog"

	"github.com/wargasipil/facego/internal/configs"
	internaldb "github.com/wargasipil/facego/internal/db"
	"gorm.io/gorm"
)

func NewDatabase(cfg *configs.AppConfig) (*gorm.DB, error) {
	slog.Info("connecting database")
	return internaldb.New(cfg.Database.DSN())
}
