package attendance_service

import (
	"context"
	"log/slog"
	"time"

	"connectrpc.com/connect"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

// AttendancePushLog receives a raw face-detection event from the Python client
// and stores it in detection_logs with is_processed=false.
// The background processor (processor.go) reads unprocessed rows and converts
// them into Attendance records.
func (s *Service) AttendancePushLog(
	ctx context.Context,
	req *connect.Request[attendancev1.AttendancePushLogRequest],
) (*connect.Response[attendancev1.AttendancePushLogResponse], error) {
	msg := req.Msg

	seenAt := time.Now().UTC()
	if msg.SeenAt != nil {
		seenAt = msg.SeenAt.AsTime()
	}

	s.writeDetectionLog(ctx, msg, seenAt)

	return connect.NewResponse(&attendancev1.AttendancePushLogResponse{}), nil
}

// writeDetectionLog inserts a raw detection event into PostgreSQL detection_logs.
// Returns the inserted row ID (0 on error).
func (s *Service) writeDetectionLog(
	ctx context.Context,
	msg *attendancev1.AttendancePushLogRequest,
	seenAt time.Time,
) int64 {
	row := db_models.DetectionLog{
		SessionID:       msg.SessionId,
		UserID:          msg.UserId,
		StudentID:       msg.StudentId,
		StudentName:     msg.StudentName,
		ClassID:         msg.ClassId,
		ClassName:       msg.ClassName,
		ClassScheduleID: msg.ClassScheduleId,
		SeenAt:          seenAt,
	}
	if err := s.db.WithContext(ctx).Create(&row).Error; err != nil {
		slog.Warn("push_log: detection_logs insert failed", "session", msg.SessionId, "err", err)
		return 0
	}
	return row.ID
}

