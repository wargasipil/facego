//go:build wireinject
// +build wireinject

package main

import (
	"net/http"

	"github.com/google/wire"
	"github.com/urfave/cli/v3"
	"github.com/wargasipil/student_pack/webutils"
	"github.com/wargasipil/student_pack/whatsapp_service"
)

func InitializeApp() (App, error) {
	wire.Build(
		http.NewServeMux,
		NewConfig,
		webutils.NewReflectRegister,
		webutils.NewDefaultInterceptor,
		whatsapp_service.NewRegister,
		NewServeFrontend,
		NewWebAction,
		NewApp,
	)

	return &cli.Command{}, nil
}
