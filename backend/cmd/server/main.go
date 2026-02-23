package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/urfave/cli/v3"
)

func main() {
	app := &cli.Command{
		Name:  "facego-server",
		Usage: "FaceGo attendance backend server",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:    "config",
				Aliases: []string{"c"},
				Value:   "configs/dev.yaml",
				Usage:   "path to YAML config file",
				Sources: cli.EnvVars("CONFIG_FILE"),
			},
		},
		Action: run,
		Commands: []*cli.Command{
			{
				Name:   "automigrate",
				Usage:  "run GORM AutoMigrate for all db_models",
				Action: automigrate,
			},
			{
				Name:   "seed",
				Usage:  "seed development accounts and sample students",
				Action: seed,
			},
		},
	}

	if err := app.Run(context.Background(), os.Args); err != nil {
		slog.Error("exited with error", "err", err)
		os.Exit(1)
	}
}
