package notifier_service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"html/template"
	"time"

	"connectrpc.com/connect"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	notifiersv1 "github.com/wargasipil/facego/gen/notifiers/v1"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	"github.com/wargasipil/facego/internal/db_models"
	"gorm.io/gorm"
)

func (s *Service) NotifyParent(
	ctx context.Context,
	req *connect.Request[notifiersv1.NotifyParentRequest],
) (*connect.Response[notifiersv1.NotifyParentResponse], error) {
	var err error

	switch notify := req.Msg.Type.(type) {
	case *notifiersv1.NotifyParentRequest_All:
		err = s.notifyAll(ctx, notify.All)
	case *notifiersv1.NotifyParentRequest_Students:
		err = s.notifyStudent(ctx, notify.Students, req.Msg.Meta)
	}

	return connect.NewResponse(&notifiersv1.NotifyParentResponse{}), err
}

func (s *Service) notifyAll(ctx context.Context, msg *notifiersv1.NotifyAll) error {

	return errors.New("not implemented")
}

func (s *Service) notifyStudent(ctx context.Context, msg *notifiersv1.NotifyStudents, meta *notifiersv1.NotifyMeta) error {
	var err error
	// getting template
	messageTemplate, err := s.getMessageTemplate(ctx)
	if err != nil {
		return err
	}

	if messageTemplate == nil {
		return errors.New("message template not found")
	}

	err = s.
		db.
		Transaction(func(tx *gorm.DB) error {
			for _, item := range msg.Student {
				student, err := s.getStudent(tx, item.StudentId)
				if err != nil {
					return err
				}

				attendance := db_models.Attendance{}

				// getting value
				err = tx.
					Model(&db_models.Attendance{}).
					Preload("ClassSchedule").
					Preload("ClassSchedule.Class").
					First(&attendance, item.AttendanceId).
					Error

				if err != nil {
					return err
				}

				textMessage, err := messageTemplate.Execute(TemplateValue{
					StudentName: student.Name,
					ClassName:   attendance.ClassSchedule.Class.Name,
					Day:         attendance.Day.Format(time.DateOnly),
				})
				if err != nil {
					return err
				}

				message := &db_models.WhatsappMessage{
					StudentID:       item.StudentId,
					ClassID:         meta.ClassId,
					ClassScheduleID: meta.ClassScheduleId,
					AttendanceID:    item.AttendanceId,
					Status:          whatsappv1.WhatsappMessageStatus_WHATSAPP_MESSAGE_STATUS_PENDING,
					Message:         textMessage,
					StudentName:     student.Name,
					ParentName:      student.ParentName,
					Phone:           student.ParentPhone,
				}

				err = tx.
					Save(message).
					Error

				if err != nil {
					return err
				}

				err = tx.Model(&db_models.Attendance{}).Where("id = ?", attendance.ID).Update("notify_status", attendancev1.NotifyStatus_NOTIFY_STATUS_PENDING).Error
				if err != nil {
					return err
				}
			}

			return nil
		})

	return err
}

func (s *Service) getMessageTemplate(ctx context.Context) (*AbsentTemplate, error) {
	var err error
	db := s.db.WithContext(ctx)

	var templateCfg db_models.WhatsappConfig

	err = db.
		Model(&db_models.WhatsappConfig{}).
		First(&templateCfg, "id = ?", 1).
		Error

	if err != nil {
		return nil, err
	}

	return &AbsentTemplate{
		Template: template.Must(template.New("absent").Parse(templateCfg.AbsentMessageTemplate)),
	}, nil
}

func (s *Service) getStudent(tx *gorm.DB, studentID int64) (*db_models.User, error) {
	var err error

	var student db_models.User

	err = tx.
		Model(&db_models.User{}).
		First(&student, "id = ?", studentID).
		Error

	if err != nil {
		return &student, err
	}

	if student.ParentPhone == "" {
		return &student, fmt.Errorf("%s not have parent phone", student.Name)
	}

	return &student, nil
}

type TemplateValue struct {
	StudentName string
	ClassName   string
	Day         string
}

type AbsentTemplate struct {
	*template.Template
}

func (t *AbsentTemplate) Execute(data TemplateValue) (string, error) {
	var buf bytes.Buffer
	err := t.Template.Execute(&buf, data)
	if err != nil {
		return "", err
	}
	return buf.String(), nil
}
