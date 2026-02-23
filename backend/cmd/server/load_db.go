package main

import (
	"log/slog"
	"os"

	"github.com/urfave/cli/v3"
	"github.com/wargasipil/facego/internal/configs"
	internaldb "github.com/wargasipil/facego/internal/db"
	"gorm.io/gorm"
)

func loadDB(cmd *cli.Command) (*configs.AppConfig, *gorm.DB, error) {
	cfg, err := configs.Load(cmd.Root().String("config"))
	if err != nil {
		return nil, nil, err
	}

	var level slog.Level
	if err := level.UnmarshalText([]byte(cfg.Log.Level)); err != nil {
		level = slog.LevelInfo
	}
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level})))

	db, err := internaldb.New(cfg.Database.DSN())
	if err != nil {
		return nil, nil, err
	}
	slog.Info("database connected")

	return cfg, db, nil
}
