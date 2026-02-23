package main

import (
	"context"
	"os"

	"github.com/urfave/cli/v3"
)

func NewConfig() *AppConfig {
	return &AppConfig{
		OpenBrowser: false,
	}
}

type App *cli.Command

func NewApp(
	webfunc WebAction,
) App {
	return &cli.Command{
		Name: "aplikasi attendance",
		Commands: []*cli.Command{
			{
				Name:   "web",
				Action: cli.ActionFunc(webfunc),
			},
		},
	}
}

func main() {
	var err error
	var app *cli.Command
	app, err = InitializeApp()
	if err != nil {
		panic(err)
	}

	err = app.Run(context.Background(), os.Args)
	if err != nil {
		panic(err)
	}
}
