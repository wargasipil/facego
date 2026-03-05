package whatsapp_service

import (
	"context"
	"time"

	"connectrpc.com/connect"
	whatsappv1 "github.com/wargasipil/facego/gen/whatsapp/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

// alertRow scans the joined attendance+user data needed for alerts.
type alertRow struct {
	UserID      int64     `gorm:"column:user_id"`
	Name        string    `gorm:"column:name"`
	ClassName   string    `gorm:"column:class_name"`
	ParentName  string    `gorm:"column:parent_name"`
	ParentPhone string    `gorm:"column:parent_phone"`
	Status      string    `gorm:"column:status"`
	CheckInTime time.Time `gorm:"column:check_in_time"`
}

func (s *Service) SendAttendanceAlerts(
	ctx context.Context,
	req *connect.Request[whatsappv1.SendAttendanceAlertsRequest],
) (*connect.Response[whatsappv1.SendAttendanceAlertsResponse], error) {
	// Determine day bounds
	var dayStart, dayEnd time.Time
	if req.Msg.Date != nil {
		t := req.Msg.Date.AsTime()
		y, m, d := t.Date()
		dayStart = time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
	} else {
		now := time.Now().UTC()
		y, m, d := now.Date()
		dayStart = time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
	}
	dayEnd = dayStart.Add(24 * time.Hour)

	// Collect which statuses to notify
	if !req.Msg.NotifyAbsent {
		return connect.NewResponse(&whatsappv1.SendAttendanceAlertsResponse{}), nil
	}

	// Build query with DISTINCT ON to get one record per student
	sql := `
SELECT DISTINCT ON (a.user_id)
    a.user_id,
    u.name,
    COALESCE(c.name, '') AS class_name,
    u.parent_name,
    u.parent_phone,
    a.status,
    MIN(a.check_in_time) OVER (PARTITION BY a.user_id) AS check_in_time
FROM attendances a
JOIN users u ON u.id = a.user_id
LEFT JOIN class_enrollments ce ON ce.user_id = u.id
LEFT JOIN classes c ON c.id = ce.class_id
WHERE a.check_in_time >= ? AND a.check_in_time < ?
  AND a.status = 2`
	args := []any{dayStart, dayEnd}

	if req.Msg.ClassFilter != "" {
		sql += ` AND c.name = ?`
		args = append(args, req.Msg.ClassFilter)
	}
	if len(req.Msg.UserIds) > 0 {
		sql += ` AND a.user_id IN ?`
		args = append(args, req.Msg.UserIds)
	}
	sql += ` ORDER BY a.user_id, a.check_in_time ASC`

	var rows []alertRow
	if err := s.db.WithContext(ctx).Raw(sql, args...).Scan(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Load config for templates
	var cfgModel db_models.WhatsappConfig
	s.db.WithContext(ctx).First(&cfgModel)
	absentTmpl := cfgModel.AbsentMessageTemplate
	if absentTmpl == "" {
		absentTmpl = defaultAbsentTemplate
	}

	var queued, skipped int32
	var created []*whatsappv1.WhatsappMessage

	for _, row := range rows {
		if row.ParentPhone == "" {
			skipped++
			continue
		}

		// msg := renderTemplate(absentTmpl, row.Name, row.ParentName, row.ClassName, row.CheckInTime)

		model := db_models.WhatsappMessage{
			// UserID:     row.UserID,
			// Name:       row.Name,
			// ParentName: row.ParentName,
			// Phone:      row.ParentPhone,
			// Message:    msg,
			// Status:     "pending",
		}
		if err := s.db.WithContext(ctx).Create(&model).Error; err != nil {
			continue
		}
		queued++
		created = append(created, msgToProto(model))
	}

	return connect.NewResponse(&whatsappv1.SendAttendanceAlertsResponse{
		Queued:   queued,
		Skipped:  skipped,
		Messages: created,
	}), nil
}
