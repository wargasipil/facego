package runner

import (
	"context"
	"time"
)

type RunnerContext struct {
	ctx    context.Context
	cancel context.CancelFunc
	Error  error
}

func NewRunnerContext(ctx context.Context) *RunnerContext {
	ctx, cancel := context.WithCancel(ctx)
	return &RunnerContext{ctx: ctx, cancel: cancel}
}

func (w *RunnerContext) Run(handler func(wctx *RunnerContext) error) {
	go func() {
		var err error
		err = handler(w)
		if err != nil {
			w.SetError(err)
		}
	}()
}

func (w *RunnerContext) RunPeriodic(interval time.Duration, handler func(wctx *RunnerContext) error) {

	go func() {
		var err error
		ticker := time.NewTimer(interval)
		defer ticker.Stop()

	Loop:
		for {
			select {
			case <-w.ctx.Done():
				break Loop
			case <-ticker.C:
				err = handler(w)
				if err != nil {
					w.SetError(err)
				}
				ticker.Reset(interval)
			}
		}
	}()
}

func (w *RunnerContext) SetError(err error) {

	if err != nil {
		if w.Error == nil {
			w.Error = err
		}
	}
	w.cancel()
}

func (w *RunnerContext) Cancel() {
	w.cancel()
}

// Deadline implements [context.Context].
func (w *RunnerContext) Deadline() (deadline time.Time, ok bool) {
	return w.ctx.Deadline()
}

// Done implements [context.Context].
func (w *RunnerContext) Done() <-chan struct{} {
	return w.ctx.Done()
}

// Err implements [context.Context].
func (w *RunnerContext) Err() error {
	return w.ctx.Err()
}

// Value implements [context.Context].
func (w *RunnerContext) Value(key any) any {
	return w.ctx.Value(key)
}
