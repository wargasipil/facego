package main

import (
	"context"

	"github.com/urfave/cli/v3"
	"github.com/wargasipil/facego/pkgs/runner"
)

type AppRunnerFunc cli.ActionFunc

func NewAppRunner(
	apiRunner ApiRunner,
) AppRunnerFunc {
	return func(ctx context.Context, c *cli.Command) error {
		// create runner
		rctx := runner.NewRunnerContext(ctx)

		rctx.Run(runner.RunnerFunc(apiRunner))

		<-rctx.Done()
		return rctx.Error

	}
}
