package db_models

import "time"

// ClassSchedule holds one weekly time slot for a class.
type ClassSchedule struct {
	ID        int64     `gorm:"primaryKey;column:id;autoIncrement"`
	ClassID   int64     `gorm:"column:class_id;not null;index"`
	Class     Class     `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	DayOfWeek int32     `gorm:"column:day_of_week;not null"` // 1=Mon … 7=Sun
	StartTime time.Time `gorm:"column:start_time;not null"`  // "08:00"
	EndTime   time.Time `gorm:"column:end_time;not null"`    // "09:30"
	Subject   string    `gorm:"column:subject;not null;default:''"`
	Room      string    `gorm:"column:room;not null;default:''"`
}

func (ClassSchedule) TableName() string { return "class_schedules" }

type ClassScheduleList []*ClassSchedule

// GetSchedule returns the first schedule slot whose day-of-week and time window
// contains t (day 1=Mon…7=Sun, time compared by hour+minute only).
// Returns nil if no slot matches.
func (c ClassScheduleList) GetSchedule(t time.Time) *ClassSchedule {
	dow := int32(t.Weekday())
	if dow == 0 {
		dow = 7
	}
	tMins := t.Hour()*60 + t.Minute()
	for _, sch := range c {
		if sch.DayOfWeek != dow {
			continue
		}
		startMins := sch.StartTime.Hour()*60 + sch.StartTime.Minute()
		endMins := sch.EndTime.Hour()*60 + sch.EndTime.Minute()
		if tMins >= startMins && tMins <= endMins {
			return sch
		}
	}
	return nil
}
