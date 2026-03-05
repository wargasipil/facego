package notifier_service

import (
	"log/slog"

	"github.com/wargasipil/facego/gen/whatsapp/v1/whatsappv1connect"
	"github.com/wargasipil/facego/pkgs/runner"
)

type NotifierRunnerFunc runner.RunnerFunc

func NewNotifierRunner(
	whatsappSrv whatsappv1connect.WhatsappServiceHandler,
) NotifierRunnerFunc {
	return func(wctx *runner.RunnerContext) error {

		slog.Info("running notifier")
		return nil
	}
}
