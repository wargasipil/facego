package main

import (
	"context"
	"os"

	"github.com/urfave/cli/v3"
)

type App *cli.Command

func NewApp(
	apprunner AppRunnerFunc,
	autoMigrate AutoMigrateFunc,
	seed SeedFunc,
) App {
	return &cli.Command{
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
		Action: cli.ActionFunc(apprunner),
		Commands: []*cli.Command{
			{
				Name:   "automigrate",
				Usage:  "run GORM AutoMigrate for all db_models",
				Action: cli.ActionFunc(autoMigrate),
			},
			{
				Name:   "seed",
				Usage:  "seed development accounts and sample students",
				Action: cli.ActionFunc(seed),
			},
		},
	}
}

func main() {
	var err error
	var app *cli.Command

	app, err = initApp()
	if err != nil {
		panic(err)
	}

	err = app.Run(context.Background(), os.Args)
	if err != nil {
		panic(err)
	}
}
