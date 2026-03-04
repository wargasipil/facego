package notifier_service

import (
	"gorm.io/gorm"

	notifiersv1connect "github.com/wargasipil/facego/gen/notifiers/v1/notifiersv1connect"
)

// Service implements notifiersv1connect.NotifierServiceHandler.
type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) notifiersv1connect.NotifierServiceHandler {
	return &Service{db: db}
}
