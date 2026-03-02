package attendance_service

import (
	"context"
	"time"

	"connectrpc.com/connect"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	attendancev1connect "github.com/wargasipil/facego/gen/attendance/v1/attendancev1connect"
)

var _ attendancev1connect.AttendanceServiceHandler = (*Service)(nil)

func (s *Service) GetDailyAttendance(
	ctx context.Context,
	req *connect.Request[attendancev1.GetDailyAttendanceRequest],
) (*connect.Response[attendancev1.GetDailyAttendanceResponse], error) {
	// Determine the day bounds
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

	// dailyAttendanceSQL uses DISTINCT ON + window functions to return one row
	// per student with MIN(check_in_time) as first seen and MAX as last seen.
	sql := dailyAttendanceSQL + `WHERE a.check_in_time >= ? AND a.check_in_time < ?`
	args := []any{dayStart, dayEnd}

	if req.Msg.ClassFilter != "" {
		sql += ` AND c.name = ?`
		args = append(args, req.Msg.ClassFilter)
	}

	// DISTINCT ON requires ORDER BY to start with the same expressions
	sql += ` ORDER BY a.user_id, COALESCE(ce.class_id, 0), a.check_in_time ASC`

	var rows []attendanceRow
	if err := s.db.WithContext(ctx).Raw(sql, args...).Scan(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	records := make([]*attendancev1.AttendanceRecord, 0, len(rows))
	summary := &attendancev1.AttendanceSummary{}
	seen := map[int64]bool{}
	for _, r := range rows {
		records = append(records, r.toProto())
		if !seen[r.UserID] {
			seen[r.UserID] = true
			summary.Total++
			switch r.Status {
			case attendancev1.AttendanceStatus_ATTENDANCE_STATUS_PRESENT:
				summary.Present++
			case attendancev1.AttendanceStatus_ATTENDANCE_STATUS_ABSENT:
				summary.Absent++
			}
		}
	}

	return connect.NewResponse(&attendancev1.GetDailyAttendanceResponse{
		Records: records,
		Summary: summary,
	}), nil
}
