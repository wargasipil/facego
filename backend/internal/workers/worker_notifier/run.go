package worker_notifier

import (
	"github.com/wargasipil/facego/pkgs/runner"
	"gorm.io/gorm"
)

type RunnerFunc func(rctx *runner.RunnerContext) error

func NewRunner(db *gorm.DB) RunnerFunc {

	return func(rctx *runner.RunnerContext) error {

		return nil
	}
}
