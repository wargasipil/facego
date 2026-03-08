package main

import (
	"context"
	"time"

	"github.com/urfave/cli/v3"
	"github.com/wargasipil/facego/internal/services/attendance_service"
	"github.com/wargasipil/facego/internal/services/notifier_service"
	"github.com/wargasipil/facego/pkgs/runner"
)

type AppRunnerFunc cli.ActionFunc

func NewAppRunner(
	apiRunner ApiRunner,
	notifierRunner notifier_service.NotifierRunnerFunc,
	attendanceRunner attendance_service.AttendanceProcessorFunc,
) AppRunnerFunc {
	return func(ctx context.Context, c *cli.Command) error {
		// create runner
		rctx := runner.NewRunnerContext(ctx)
		rctx.RunPeriodic("notifier_runner", time.Minute, runner.RunnerFunc(notifierRunner))
		rctx.RunPeriodic("attendance_runner", time.Second*5, runner.RunnerFunc(attendanceRunner))
		rctx.Run(runner.RunnerFunc(apiRunner))

		<-rctx.Done()
		return rctx.Error

	}
}
