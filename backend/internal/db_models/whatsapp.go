package db_models

import (
	"time"

	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
)

type WhatsappMessage struct {
	ID              int64 `gorm:"primaryKey;column:id;autoIncrement"`
	StudentID       int64 `gorm:"column:user_id;not null;index"`
	ClassID         int64
	ClassScheduleID int64
	AttendanceID    int64

	Phone       string
	StudentName string
	ParentName  string
	Status      whatsappv1.WhatsappMessageStatus
	Message     string
	Error       string
	SentAt      time.Time `gorm:"column:sent_at;autoCreateTime"`
}

func (WhatsappMessage) TableName() string { return "whatsapp_messages" }

// WhatsappConfig is a single-row settings table (id = 1 always).
type WhatsappConfig struct {
	ID                    uint   `gorm:"primaryKey;column:id;autoIncrement"`
	Enabled               bool   `gorm:"column:enabled;not null;default:true"`
	LateMessageTemplate   string `gorm:"column:late_message_template;not null;default:''"`
	AbsentMessageTemplate string `gorm:"column:absent_message_template;not null;default:''"`
	SenderName            string `gorm:"column:sender_name;not null;default:'FaceGo'"`
}

func (WhatsappConfig) TableName() string { return "whatsapp_configs" }
