package whatsapp_service

import (
	"context"
	"log/slog"
	"strings"
	"sync"
	"time"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

const defaultLateTemplate = "Assalamualaikum {parent_name}, ananda {student_name} dari kelas {class} datang terlambat pada {date} pukul {time}. Harap hubungi pihak sekolah untuk informasi lebih lanjut."
const defaultAbsentTemplate = "Assalamualaikum {parent_name}, ananda {student_name} dari kelas {class} tidak hadir pada {date}. Harap hubungi pihak sekolah jika ada keterangan yang sah."

// waEvent is the internal fan-out event for WStream subscribers.
type waEvent struct {
	QRCode        string // set when a new QR code arrives
	SyncCompleted bool   // set when login succeeds
}

func msgToProto(m db_models.WhatsappMessage) *whatsappv1.WhatsappMessage {
	return &whatsappv1.WhatsappMessage{
		Id:         m.ID,
		UserId:     m.UserID,
		Name:       m.Name,
		ParentName: m.ParentName,
		Phone:      m.Phone,
		Message:    m.Message,
		Status:     m.Status,
		Error:      m.Error,
		SentAt:     timestamppb.New(m.SentAt),
	}
}

func configToProto(c db_models.WhatsappConfig) *whatsappv1.WhatsappConfig {
	return &whatsappv1.WhatsappConfig{
		Enabled:               c.Enabled,
		LateMessageTemplate:   c.LateMessageTemplate,
		AbsentMessageTemplate: c.AbsentMessageTemplate,
		SenderName:            c.SenderName,
	}
}

func renderTemplate(tmpl, studentName, parentName, className string, ts time.Time) string {
	r := strings.NewReplacer(
		"{student_name}", studentName,
		"{parent_name}", parentName,
		"{class}", className,
		"{date}", ts.Format("02/01/2006"),
		"{time}", ts.Format("15:04"),
	)
	return r.Replace(tmpl)
}

// Service implements whatsappv1connect.WhatsappServiceHandler.
type Service struct {
	db *gorm.DB
	wa *whatsmeow.Client

	mu     sync.RWMutex
	subs   map[chan waEvent]struct{}
	lastQR string // last QR code, sent to new WStream subscribers immediately
}

func New(db *gorm.DB) (*Service, error) {
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	container := sqlstore.NewWithDB(sqlDB, "postgres", waLog.Noop)

	if err = container.Upgrade(context.Background()); err != nil {
		return nil, err
	}

	device, err := container.GetFirstDevice(context.Background())
	if err != nil {
		return nil, err
	}
	if device == nil {
		device = container.NewDevice()
	}

	s := &Service{
		db:   db,
		wa:   whatsmeow.NewClient(device, waLog.Noop),
		subs: make(map[chan waEvent]struct{}),
	}

	s.wa.AddEventHandler(s.handleWAEvent)
	go s.connect()

	return s, nil
}

// connect starts the WhatsApp connection. If not logged in, opens a QR channel first.
func (s *Service) connect() {
	if s.wa.Store.ID == nil {
		// Not logged in — get QR channel before connecting
		ctx := context.Background()
		qrChan, err := s.wa.GetQRChannel(ctx)
		if err != nil {
			slog.Error("whatsapp: GetQRChannel failed", "err", err)
			return
		}
		if err := s.wa.Connect(); err != nil {
			slog.Error("whatsapp: Connect failed", "err", err)
			return
		}
		for evt := range qrChan {
			switch evt.Event {
			case "code":
				slog.Info("whatsapp: new QR code")
				s.mu.Lock()
				s.lastQR = evt.Code
				s.mu.Unlock()
				s.broadcast(waEvent{QRCode: evt.Code})
			case "success":
				s.mu.Lock()
				s.lastQR = ""
				s.mu.Unlock()
				s.broadcast(waEvent{SyncCompleted: true})
			case "timeout", "error":
				slog.Warn("whatsapp: QR channel ended", "event", evt.Event)
			}
		}
	} else {
		// Already logged in — just connect
		if err := s.wa.Connect(); err != nil {
			slog.Error("whatsapp: Connect failed", "err", err)
		}
	}
}

// handleWAEvent receives events from the whatsmeow client.
func (s *Service) handleWAEvent(evt interface{}) {
	switch evt.(type) {
	case *events.Connected:
		slog.Info("whatsapp: connected")
		s.mu.Lock()
		s.lastQR = ""
		s.mu.Unlock()
		s.broadcast(waEvent{SyncCompleted: true})
	case *events.LoggedOut:
		slog.Warn("whatsapp: logged out — reconnecting for new QR")
		go s.connect()
	}
}

// subscribe creates a buffered channel that receives broadcast events.
func (s *Service) subscribe() chan waEvent {
	ch := make(chan waEvent, 16)
	s.mu.Lock()
	s.subs[ch] = struct{}{}
	s.mu.Unlock()
	return ch
}

// unsubscribe removes a subscriber channel.
func (s *Service) unsubscribe(ch chan waEvent) {
	s.mu.Lock()
	delete(s.subs, ch)
	s.mu.Unlock()
}

// broadcast sends an event to all subscribers, dropping if a buffer is full.
func (s *Service) broadcast(evt waEvent) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for ch := range s.subs {
		select {
		case ch <- evt:
		default:
		}
	}
}
