package db_models

import "time"

type WhatsappMessage struct {
	ID         int64     `gorm:"primaryKey;column:id;autoIncrement"`
	UserID     int64     `gorm:"column:user_id;not null;index"`
	Name       string    `gorm:"column:name;not null;default:''"`
	ParentName string    `gorm:"column:parent_name;not null;default:''"`
	Phone      string    `gorm:"column:phone;not null"`
	Message    string    `gorm:"column:message;not null"`
	Status     string    `gorm:"column:status;not null;default:'pending'"`
	Error      string    `gorm:"column:error;not null;default:''"`
	SentAt     time.Time `gorm:"column:sent_at;autoCreateTime"`
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
