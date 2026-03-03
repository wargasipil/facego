package notifier_service

import (
	"gorm.io/gorm"

	notifiersv1connect "github.com/wargasipil/facego/gen/notifiers/v1/notifiersv1connect"
)

var _ notifiersv1connect.NotifierServiceHandler = (*Service)(nil)

// Service implements notifiersv1connect.NotifierServiceHandler.
type Service struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Service {
	return &Service{db: db}
}
