package notifier_service

import (
	"bytes"
	"context"
	"errors"
	"html/template"

	"connectrpc.com/connect"
	notifiersv1 "github.com/wargasipil/facego/gen/notifiers/v1"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	"github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) NotifyParent(
	ctx context.Context,
	req *connect.Request[notifiersv1.NotifyParentRequest],
) (*connect.Response[notifiersv1.NotifyParentResponse], error) {
	var err error

	switch notify := req.Msg.Type.(type) {
	case *notifiersv1.NotifyParentRequest_All:
		err = s.notifyAll(ctx, notify.All)
	case *notifiersv1.NotifyParentRequest_Student:
		err = s.notifyStudent(ctx, notify.Student)
	}

	return connect.NewResponse(&notifiersv1.NotifyParentResponse{}), err
}

func (s *Service) notifyAll(ctx context.Context, msg *notifiersv1.NotifyAll) error {

	return nil
}

func (s *Service) notifyStudent(ctx context.Context, msg *notifiersv1.NotifyStudent) error {
	var err error
	// getting template
	messageTemplate, err := s.getMessageTemplate(ctx)
	if err != nil {
		return err
	}

	if messageTemplate == nil {
		return errors.New("message template not found")
	}

	// getting parent phone number
	for _, studentId := range msg.StudentIds {
		parentPhone, err := s.getParentPhone(ctx, studentId)
		if err != nil {
			return err
		}

		message, err := messageTemplate.Execute(TemplateValue{})
		if err != nil {
			return err
		}

		s.waclient.SendMessage(ctx, &connect.Request[whatsappv1.SendMessageRequest]{
			Msg: &whatsappv1.SendMessageRequest{
				Phone:   parentPhone,
				Message: message,
			},
		})

	}

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

func (s *Service) getParentPhone(ctx context.Context, studentID int64) (string, error) {
	var err error
	db := s.db.WithContext(ctx)

	var student db_models.User

	err = db.
		Model(&db_models.User{}).
		First(&student, "id = ?", studentID).
		Error

	if err != nil {
		return "", err
	}

	return student.ParentPhone, nil
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
