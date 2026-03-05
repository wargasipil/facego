package attendance_service

import (
	"context"

	"connectrpc.com/connect"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
)

func (s *Service) ListAttendance(
	ctx context.Context,
	req *connect.Request[attendancev1.ListAttendanceRequest],
) (*connect.Response[attendancev1.ListAttendanceResponse], error) {
	sql := attendanceJoinSQL + `WHERE 1=1`
	args := []any{}

	if req.Msg.UserId != 0 {
		sql += ` AND a.user_id = ?`
		args = append(args, req.Msg.UserId)
	}
	if req.Msg.From != nil {
		sql += ` AND a.check_in_time >= ?`
		args = append(args, req.Msg.From.AsTime())
	}
	if req.Msg.To != nil {
		sql += ` AND a.check_in_time < ?`
		args = append(args, req.Msg.To.AsTime())
	}

	sql += ` ORDER BY a.check_in_time DESC`

	var rows []attendanceRow
	if err := s.db.WithContext(ctx).Raw(sql, args...).Scan(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	records := make([]*attendancev1.AttendanceRecord, 0, len(rows))

	return connect.NewResponse(&attendancev1.ListAttendanceResponse{
		Records: records,
	}), nil
}
