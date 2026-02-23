package main

import (
	"context"
	"log/slog"
	"net/http"

	"connectrpc.com/connect"
	"connectrpc.com/grpcreflect"
	"github.com/rs/cors"
	"github.com/urfave/cli/v3"
	attendancev1connect "github.com/wargasipil/facego/gen/attendance/v1/attendancev1connect"
	authv1connect "github.com/wargasipil/facego/gen/auth/v1/authv1connect"
	classesv1connect "github.com/wargasipil/facego/gen/classes/v1/classesv1connect"
	"github.com/wargasipil/facego/gen/grades/v1/gradesv1connect"
	studyprogramsv1connect "github.com/wargasipil/facego/gen/study_programs/v1/study_programsv1connect"
	teachersv1connect "github.com/wargasipil/facego/gen/teachers/v1/teachersv1connect"
	usersv1connect "github.com/wargasipil/facego/gen/users/v1/usersv1connect"
	whatsappv1connect "github.com/wargasipil/facego/gen/whatsapp/v1/whatsappv1connect"
	"github.com/wargasipil/facego/internal/interceptors"
	"github.com/wargasipil/facego/internal/services/attendance_service"
	"github.com/wargasipil/facego/internal/services/auth_service"
	"github.com/wargasipil/facego/internal/services/class_service"
	"github.com/wargasipil/facego/internal/services/grade_service"
	"github.com/wargasipil/facego/internal/services/study_program_service"
	"github.com/wargasipil/facego/internal/services/teacher_service"
	"github.com/wargasipil/facego/internal/services/user_service"
	"github.com/wargasipil/facego/internal/services/whatsapp_service"
)

func run(ctx context.Context, cmd *cli.Command) error {
	cfg, db, err := loadDB(cmd)
	if err != nil {
		return err
	}

	jwtSecret := cfg.Auth.JWTSecret
	if jwtSecret == "" {
		jwtSecret = "change-me-in-production"
	}

	// Services
	authSvc          := auth_service.New(db, jwtSecret)
	gradeSvc         := grade_service.New(db)
	studyProgramSvc  := study_program_service.New(db)
	classSvc         := class_service.New(db)
	userSvc          := user_service.New(db, cfg.Storage.UploadsDir)
	teacherSvc       := teacher_service.New(db)
	attendanceSvc    := attendance_service.New(db)
	whatsappSvc, err := whatsapp_service.New(db)
	if err != nil {
		return err
	}

	// Interceptors
	validateOpt := connect.WithInterceptors(interceptors.Validate())
	authOpts := connect.WithInterceptors(
		interceptors.Auth(jwtSecret, "/auth.v1.AuthService/Login"),
		interceptors.Validate(),
	)

	// HTTP mux
	mux := http.NewServeMux()

	// Auth service (Login is public; other auth endpoints require JWT)
	mux.Handle(authv1connect.NewAuthServiceHandler(authSvc, authOpts))

	// All other services require JWT
	mux.Handle(gradesv1connect.NewGradeServiceHandler(gradeSvc, authOpts))
	mux.Handle(studyprogramsv1connect.NewStudyProgramServiceHandler(studyProgramSvc, authOpts))
	mux.Handle(classesv1connect.NewClassServiceHandler(classSvc, authOpts))
	mux.Handle(usersv1connect.NewUserServiceHandler(userSvc, authOpts))
	mux.Handle(teachersv1connect.NewTeacherServiceHandler(teacherSvc, authOpts))
	mux.Handle(attendancev1connect.NewAttendanceServiceHandler(attendanceSvc, authOpts))
	mux.Handle(whatsappv1connect.NewWhatsappServiceHandler(whatsappSvc, authOpts))

	_ = validateOpt // kept for reference if needed

	// Static file serving for uploaded face images
	if cfg.Storage.UploadsDir != "" {
		mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(cfg.Storage.UploadsDir))))
	}

	// gRPC reflection (for grpcurl, Postman, etc.)
	reflector := grpcreflect.NewStaticReflector(
		authv1connect.AuthServiceName,
		gradesv1connect.GradeServiceName,
		studyprogramsv1connect.StudyProgramServiceName,
		classesv1connect.ClassServiceName,
		usersv1connect.UserServiceName,
		teachersv1connect.TeacherServiceName,
		attendancev1connect.AttendanceServiceName,
		whatsappv1connect.WhatsappServiceName,
	)
	mux.Handle(grpcreflect.NewHandlerV1(reflector))
	mux.Handle(grpcreflect.NewHandlerV1Alpha(reflector))

	addr := cfg.Server.Addr()
	slog.Info("starting FaceGo server", "addr", addr)

	return http.ListenAndServe(addr, cors.AllowAll().Handler(mux))
}
