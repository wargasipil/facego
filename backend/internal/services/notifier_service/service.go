package notifier_service

import (
	"gorm.io/gorm"

	notifiersv1connect "github.com/wargasipil/facego/gen/notifiers/v1/notifiersv1connect"
	"github.com/wargasipil/facego/gen/whatsapp/v1/whatsappv1connect"
)

// Service implements notifiersv1connect.NotifierServiceHandler.
type Service struct {
	db       *gorm.DB
	waclient whatsappv1connect.WhatsappServiceClient
}

func NewService(db *gorm.DB) notifiersv1connect.NotifierServiceHandler {
	return &Service{db: db}
}
