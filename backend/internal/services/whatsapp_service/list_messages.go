package whatsapp_service

import (
	"context"

	"connectrpc.com/connect"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"github.com/wargasipil/facego/pkgs/runner"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/gorm"
)

func (s *Service) ListMessages(
	ctx context.Context,
	req *connect.Request[whatsappv1.ListMessagesRequest],
) (*connect.Response[whatsappv1.ListMessagesResponse], error) {
	var err error

	db := s.db.WithContext(ctx)
	result := whatsappv1.ListMessagesResponse{
		Messages: []*whatsappv1.WhatsappMessage{},
		Total:    0,
	}

	pay := req.Msg

	call := runner.NewChainParam(
		func(next runner.NextFuncParam[*gorm.DB]) runner.NextFuncParam[*gorm.DB] {
			return func(query *gorm.DB) (*gorm.DB, error) { // base query
				query = query.
					Model(&db_models.WhatsappMessage{})
				return next(query)
			}
		},
		func(next runner.NextFuncParam[*gorm.DB]) runner.NextFuncParam[*gorm.DB] {
			return func(query *gorm.DB) (*gorm.DB, error) { // getting total
				err := query.
					Session(&gorm.Session{}).
					Select("count(1)").
					Find(&result.Total).
					Error

				if err != nil {
					return query, err
				}

				return next(query)
			}
		},
		func(next runner.NextFuncParam[*gorm.DB]) runner.NextFuncParam[*gorm.DB] {
			return func(query *gorm.DB) (*gorm.DB, error) {
				datas := []*db_models.WhatsappMessage{}

				query = query.
					Order("id desc").
					Limit(int(pay.PageSize))

				if pay.Page > 1 {
					offset := (pay.Page - 1) * pay.PageSize
					query = query.
						Offset(int(offset))
				}

				err := query.
					Find(&datas).
					Error

				if err != nil {
					return query, err
				}

				for _, data := range datas {
					result.Messages = append(result.Messages, &whatsappv1.WhatsappMessage{
						Id:              data.ID,
						StudentId:       data.StudentID,
						ClassId:         data.ClassID,
						ClassScheduleId: data.ClassScheduleID,
						AttendanceId:    data.AttendanceID,
						StudentName:     data.StudentName,
						ParentName:      data.ParentName,
						Phone:           data.Phone,
						Message:         data.Message,
						Status:          data.Status,
						Error:           data.Error,
						SentAt:          timestamppb.New(data.SentAt),
						CreatedAt:       timestamppb.New(data.CreatedAt),
					})
				}

				return next(query)
			}
		},
	)

	_, err = call(db)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&result), nil
}
