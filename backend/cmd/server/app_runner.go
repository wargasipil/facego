package main

import (
	"context"
	"time"

	"github.com/urfave/cli/v3"
	"github.com/wargasipil/facego/internal/services/notifier_service"
	"github.com/wargasipil/facego/pkgs/runner"
)

type AppRunnerFunc cli.ActionFunc

func NewAppRunner(
	apiRunner ApiRunner,
	notifierRunner notifier_service.NotifierRunnerFunc,
) AppRunnerFunc {
	return func(ctx context.Context, c *cli.Command) error {
		// create runner
		rctx := runner.NewRunnerContext(ctx)
		rctx.RunPeriodic(time.Second*5, runner.RunnerFunc(notifierRunner))
		rctx.Run(runner.RunnerFunc(apiRunner))

		<-rctx.Done()
		return rctx.Error

	}
}
