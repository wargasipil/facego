//go:build wireinject

// This file is processed only by the wire tool, not by the Go compiler.
// Run `wire` (or `go run github.com/google/wire/cmd/wire`) in this directory
// to generate wire_gen.go.

package main

import (
	"github.com/google/wire"
	"github.com/urfave/cli/v3"
	"github.com/wargasipil/facego/internal/services/attendance_service"
	"github.com/wargasipil/facego/internal/services/auth_service"
	"github.com/wargasipil/facego/internal/services/class_service"
	"github.com/wargasipil/facego/internal/services/face_embedding_service"
	"github.com/wargasipil/facego/internal/services/grade_service"
	"github.com/wargasipil/facego/internal/services/notifier_service"
	"github.com/wargasipil/facego/internal/services/study_program_service"
	"github.com/wargasipil/facego/internal/services/teacher_service"
	"github.com/wargasipil/facego/internal/services/user_service"
	"github.com/wargasipil/facego/internal/services/whatsapp_service"
)

func initApp() (App, error) {
	wire.Build(
		NewConfig,
		NewDatabase,
		auth_service.NewService,
		grade_service.NewService,
		study_program_service.NewService,
		class_service.NewService,
		user_service.NewService,
		teacher_service.NewService,
		attendance_service.NewService,
		face_embedding_service.NewService,
		whatsapp_service.NewService,
		notifier_service.NewService,
		notifier_service.NewNotifierRunner,
		NewApiRunner,
		NewAppRunner,
		NewAutoMigrate,
		NewSeed,
		NewApp,
	)
	return &cli.Command{}, nil
}
