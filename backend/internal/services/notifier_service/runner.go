package notifier_service

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"connectrpc.com/connect"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	"github.com/wargasipil/facego/gen/whatsapp/v1/whatsappv1connect"
	"github.com/wargasipil/facego/internal/db_models"
	"github.com/wargasipil/facego/pkgs/runner"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type NotifierRunnerFunc runner.RunnerFunc

func NewNotifierRunner(
	whatsappSrv whatsappv1connect.WhatsappServiceHandler,
	db *gorm.DB,
) NotifierRunnerFunc {

	return func(wctx *runner.RunnerContext) error {
		var err error

		ctx, cancel := context.WithTimeout(wctx, time.Minute*10)
		defer cancel()

		err = db.
			WithContext(ctx).
			Transaction(func(tx *gorm.DB) error {

				caller := runner.NewChainParam(
					func(next runner.NextFuncParam[[]*db_models.WhatsappMessage]) runner.NextFuncParam[[]*db_models.WhatsappMessage] {
						return func(data []*db_models.WhatsappMessage) ([]*db_models.WhatsappMessage, error) { // getting data
							slog.Info("waiting and getting message to send")
							err = tx.
								Clauses(
									clause.Locking{
										Strength: "UPDATE",
									},
								).
								Model(&db_models.WhatsappMessage{}).
								Where("status = ?", whatsappv1.WhatsappMessageStatus_WHATSAPP_MESSAGE_STATUS_PENDING).
								Limit(20).
								Find(&data).
								Error

							if err != nil {
								return data, err
							}

							if len(data) == 0 {
								return data, nil
							}

							return next(data)
						}
					},
					func(next runner.NextFuncParam[[]*db_models.WhatsappMessage]) runner.NextFuncParam[[]*db_models.WhatsappMessage] {
						return func(data []*db_models.WhatsappMessage) ([]*db_models.WhatsappMessage, error) { // send to whatsapp
							sended := []*db_models.WhatsappMessage{}
							var phone string

							for _, item := range data {
								phone = strings.ReplaceAll(item.Phone, "+", "")
								phone = strings.ReplaceAll(phone, " ", "")

								_, err = whatsappSrv.SendMessage(ctx, &connect.Request[whatsappv1.SendMessageRequest]{
									Msg: &whatsappv1.SendMessageRequest{
										Phone:   phone,
										Message: item.Message,
									},
								})

								if err != nil {
									slog.Error("gagal kirim pesan", "err", err.Error())
									// updating message
									item.Status = whatsappv1.WhatsappMessageStatus_WHATSAPP_MESSAGE_STATUS_ERROR
									item.Error = err.Error()
									// saving to database
									err = tx.Save(item).Error
									if err != nil {
										return data, err
									}

									continue
								}

								sended = append(sended, item)
							}

							return next(sended)
						}
					},
					func(next runner.NextFuncParam[[]*db_models.WhatsappMessage]) runner.NextFuncParam[[]*db_models.WhatsappMessage] {
						return func(data []*db_models.WhatsappMessage) ([]*db_models.WhatsappMessage, error) { // change attendance status
							for _, item := range data {

								// updating status and sent at
								item.SentAt = time.Now()
								item.Status = whatsappv1.WhatsappMessageStatus_WHATSAPP_MESSAGE_STATUS_SENT
								err = tx.Save(item).Error
								if err != nil {
									return data, err
								}

								// updating attendance
								err = tx.
									Model(&db_models.Attendance{}).
									Where("id = ?", item.AttendanceID).
									Update("notify_status", attendancev1.NotifyStatus_NOTIFY_STATUS_NOTIFIED).
									Error

								if err != nil {
									return data, err
								}
							}
							return next(data)
						}
					},
				)

				_, err = caller([]*db_models.WhatsappMessage{})
				return err
			})

		if err != nil {
			return err
		}

		return nil
	}
}
