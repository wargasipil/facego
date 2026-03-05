package main

import (
	authv1connect "github.com/wargasipil/facego/gen/auth/v1/authv1connect"
	classesv1connect "github.com/wargasipil/facego/gen/classes/v1/classesv1connect"
	facesv1connect "github.com/wargasipil/facego/gen/faces/v1/facesv1connect"
	gradesv1connect "github.com/wargasipil/facego/gen/grades/v1/gradesv1connect"
	notifiersv1connect "github.com/wargasipil/facego/gen/notifiers/v1/notifiersv1connect"
	studyprogramsv1connect "github.com/wargasipil/facego/gen/study_programs/v1/study_programsv1connect"
	teachersv1connect "github.com/wargasipil/facego/gen/teachers/v1/teachersv1connect"
	usersv1connect "github.com/wargasipil/facego/gen/users/v1/usersv1connect"
	whatsappv1connect "github.com/wargasipil/facego/gen/whatsapp/v1/whatsappv1connect"
	"github.com/wargasipil/facego/internal/configs"
	"github.com/wargasipil/facego/internal/services/attendance_service"
)

// JWTSecret and UploadsDir are distinct string types so Wire can inject them unambiguously.
type JWTSecret string
type UploadsDir string

// ProvideJWTSecret extracts the JWT secret from config, applying a safe default.
func ProvideJWTSecret(cfg *configs.AppConfig) JWTSecret {
	s := cfg.Auth.JWTSecret
	if s == "" {
		s = "change-me-in-production"
	}
	return JWTSecret(s)
}

// App holds all initialized services and config needed to run the server.
type App2 struct {
	Cfg           *configs.AppConfig
	JWTSecret     JWTSecret
	AuthSvc       authv1connect.AuthServiceHandler
	GradeSvc      gradesv1connect.GradeServiceHandler
	StudyProgSvc  studyprogramsv1connect.StudyProgramServiceHandler
	ClassSvc      classesv1connect.ClassServiceHandler
	UserSvc       usersv1connect.UserServiceHandler
	TeacherSvc    teachersv1connect.TeacherServiceHandler
	AttendanceSvc *attendance_service.Service // kept as *Service for StartProcessor
	FaceSvc       facesv1connect.FaceEmbeddingServiceHandler
	WhatsappSvc   whatsappv1connect.WhatsappServiceHandler
	NotifierSvc   notifiersv1connect.NotifierServiceHandler
}

func NewApp2(
	cfg *configs.AppConfig,
	jwtSecret JWTSecret,
	authSvc authv1connect.AuthServiceHandler,
	gradeSvc gradesv1connect.GradeServiceHandler,
	studyProgSvc studyprogramsv1connect.StudyProgramServiceHandler,
	classSvc classesv1connect.ClassServiceHandler,
	userSvc usersv1connect.UserServiceHandler,
	teacherSvc teachersv1connect.TeacherServiceHandler,
	attendanceSvc *attendance_service.Service,
	faceSvc facesv1connect.FaceEmbeddingServiceHandler,
	whatsappSvc whatsappv1connect.WhatsappServiceHandler,
	notifierSvc notifiersv1connect.NotifierServiceHandler,
) *App2 {
	return &App2{
		Cfg:           cfg,
		JWTSecret:     jwtSecret,
		AuthSvc:       authSvc,
		GradeSvc:      gradeSvc,
		StudyProgSvc:  studyProgSvc,
		ClassSvc:      classSvc,
		UserSvc:       userSvc,
		TeacherSvc:    teacherSvc,
		AttendanceSvc: attendanceSvc,
		FaceSvc:       faceSvc,
		WhatsappSvc:   whatsappSvc,
		NotifierSvc:   notifierSvc,
	}
}
