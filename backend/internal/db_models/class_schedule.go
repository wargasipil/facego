package db_models

// ClassSchedule holds one weekly time slot for a class.
type ClassSchedule struct {
	ID        uint   `gorm:"primaryKey;column:id;autoIncrement"`
	ClassID   uint   `gorm:"column:class_id;not null;index"`
	Class     Class  `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	DayOfWeek int32  `gorm:"column:day_of_week;not null"` // 1=Mon … 7=Sun
	StartTime string `gorm:"column:start_time;not null"`  // "08:00"
	EndTime   string `gorm:"column:end_time;not null"`    // "09:30"
	Subject   string `gorm:"column:subject;not null;default:''"`
	Room      string `gorm:"column:room;not null;default:''"`
}

func (ClassSchedule) TableName() string { return "class_schedules" }
