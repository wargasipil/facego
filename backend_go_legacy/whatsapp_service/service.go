package whatsapp_service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"connectrpc.com/connect"
	_ "github.com/mattn/go-sqlite3"
	"github.com/wargasipil/student_pack/interfaces/whatsapp/v1"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
)

type waServiceImpl struct {
	lock sync.Mutex
}

// WStream implements [whatsappconnect.WhatsappServiceHandler].
func (w *waServiceImpl) WStream(ctx context.Context, req *connect.Request[whatsapp.WStreamRequest], res *connect.ServerStream[whatsapp.WStreamResponse]) error {
	if !w.lock.TryLock() {
		return errors.New("aplikasi sedang dibuka di tab atau browser lainnya")
	}

	defer w.lock.Unlock()

	dbLog := waLog.Stdout("Database", "DEBUG", true)
	container, err := sqlstore.New(ctx, "sqlite3", "file:wa.db?_foreign_keys=on", dbLog)
	if err != nil {
		panic(err)
	}

	// If you want multiple sessions, remember their JIDs and use .GetDevice(jid) or .GetAllDevices() instead.
	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		panic(err)
	}
	clientLog := waLog.Stdout("Client", "DEBUG", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)

	handler := eventHandler{ctx, res, client, nil}
	client.AddEventHandler(handler.eventHandler)

	defer client.Disconnect()

	err = handler.checkLogin()
	if err != nil {
		return err
	}
	<-ctx.Done()

	return err
}

type eventHandler struct {
	ctx   context.Context
	res   *connect.ServerStream[whatsapp.WStreamResponse]
	c     *whatsmeow.Client
	Error error
}

func (w *eventHandler) eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		fmt.Println("Received a message!", v.Message.GetConversation())
	case *events.AppStateSyncComplete:
		w.res.Send(&whatsapp.WStreamResponse{
			E: &whatsapp.WStreamResponse_SyncCompleted{
				SyncCompleted: true,
			},
		})
		// case *events.Connected:

	}
}

func (w *eventHandler) checkLogin() error {
	client := w.c

	if w.c.Store.ID == nil {
		slog.Info("getting qr code")
		qrChan, err := client.GetQRChannel(w.ctx)
		if err != nil {
			return err
		}

		client.Connect()

		for evt := range qrChan {
			if evt.Event == "code" {
				slog.Info("QR code", "code", evt.Code)
				err = w.res.Send(&whatsapp.WStreamResponse{
					E: &whatsapp.WStreamResponse_NeedLogin{
						NeedLogin: &whatsapp.NeedLogin{
							Code: evt.Code,
						},
					},
				})

				if err != nil {
					return err
				}

			}
		}
	} else {
		client.Connect()
	}

	return nil
}

// func (w *eventHandler) setErr(err error) error {
// 	if w.Error == nil {
// 		w.Error = err
// 	}
// 	return err
// }

// Status implements [whatsappconnect.WhatsappServiceHandler].
func (w *waServiceImpl) Status(context.Context, *connect.Request[whatsapp.StatusRequest]) (*connect.Response[whatsapp.StatusResponse], error) {
	panic("unimplemented")
}
