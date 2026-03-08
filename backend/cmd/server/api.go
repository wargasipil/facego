package main

import (
	"log/slog"
	"net/http"

	"connectrpc.com/connect"
	"connectrpc.com/grpcreflect"
	"github.com/rs/cors"
	attendancev1connect "github.com/wargasipil/facego/gen/attendance/v1/attendancev1connect"
	authv1connect "github.com/wargasipil/facego/gen/auth/v1/authv1connect"
	classesv1connect "github.com/wargasipil/facego/gen/classes/v1/classesv1connect"
	facesv1connect "github.com/wargasipil/facego/gen/faces/v1/facesv1connect"
	"github.com/wargasipil/facego/gen/grades/v1/gradesv1connect"
	notifiersv1connect "github.com/wargasipil/facego/gen/notifiers/v1/notifiersv1connect"
	studyprogramsv1connect "github.com/wargasipil/facego/gen/study_programs/v1/study_programsv1connect"
	teachersv1connect "github.com/wargasipil/facego/gen/teachers/v1/teachersv1connect"
	usersv1connect "github.com/wargasipil/facego/gen/users/v1/usersv1connect"
	whatsappv1connect "github.com/wargasipil/facego/gen/whatsapp/v1/whatsappv1connect"
	"github.com/wargasipil/facego/internal/configs"
	"github.com/wargasipil/facego/internal/interceptors"
	"github.com/wargasipil/facego/internal/services/attendance_service"
	"github.com/wargasipil/facego/pkgs/runner"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	"gorm.io/gorm"
)

type ApiRunner runner.RunnerFunc

func NewApiRunner(
	db *gorm.DB,
	cfg *configs.AppConfig,
	authSvc authv1connect.AuthServiceHandler,
	gradeSvc gradesv1connect.GradeServiceHandler,
	studyProgramSvc studyprogramsv1connect.StudyProgramServiceHandler,
	classSvc classesv1connect.ClassServiceHandler,
	userSvc usersv1connect.UserServiceHandler,
	teacherSvc teachersv1connect.TeacherServiceHandler,
	attendanceSvc *attendance_service.Service,
	faceSvc facesv1connect.FaceEmbeddingServiceHandler,
	whatsappSvc whatsappv1connect.WhatsappServiceHandler,
	notifierSvc notifiersv1connect.NotifierServiceHandler,
) ApiRunner {
	return func(wctx *runner.RunnerContext) error {

		jwtSecret := cfg.Auth.JWTSecret

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
		mux.Handle(facesv1connect.NewFaceEmbeddingServiceHandler(faceSvc, authOpts))
		mux.Handle(notifiersv1connect.NewNotifierServiceHandler(notifierSvc, authOpts))

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
			facesv1connect.FaceEmbeddingServiceName,
			notifiersv1connect.NotifierServiceName,
		)
		mux.Handle(grpcreflect.NewHandlerV1(reflector))
		mux.Handle(grpcreflect.NewHandlerV1Alpha(reflector))

		// registering frontend
		mux.Handle("/", NewFrontendhandler())

		addr := cfg.Server.Addr()
		slog.Info("starting FaceGo api", "addr", addr)

		// h2c enables gRPC (plaintext HTTP/2) alongside Connect and gRPC-Web
		handler := h2c.NewHandler(cors.AllowAll().Handler(mux), &http2.Server{})
		return http.ListenAndServe(addr, handler)
	}
}
