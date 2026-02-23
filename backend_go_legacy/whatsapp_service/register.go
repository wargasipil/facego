package whatsapp_service

import (
	"net/http"
	"sync"

	"github.com/wargasipil/student_pack/interfaces/whatsapp/v1/whatsappconnect"
	"github.com/wargasipil/student_pack/webutils"
)

type RegisterFunc func() []string

func NewRegister(
	mux *http.ServeMux,
	defaultInterceptor webutils.DefaultInterceptor,
) RegisterFunc {
	return func() []string {
		reflectNames := []string{}

		path, handler := whatsappconnect.NewWhatsappServiceHandler(&waServiceImpl{sync.Mutex{}}, defaultInterceptor)
		mux.Handle(path, handler)

		reflectNames = append(reflectNames, whatsappconnect.WhatsappServiceName)

		return reflectNames
	}
}
