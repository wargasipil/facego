package attendance_service

import (
	"context"
	"errors"
	"time"

	"connectrpc.com/connect"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) CreateAttendance(
	ctx context.Context,
	req *connect.Request[attendancev1.CreateAttendanceRequest],
) (*connect.Response[attendancev1.CreateAttendanceResponse], error) {
	checkIn := time.Now().UTC()
	if req.Msg.CheckInTime != nil {
		checkIn = req.Msg.CheckInTime.AsTime()
	}

	model := db_models.Attendance{
		UserID:      req.Msg.UserId,
		Status:      statusStr(req.Msg.Status),
		CheckInTime: checkIn,
		Notes:       req.Msg.Notes,
	}
	if req.Msg.ClassId > 0 {
		model.ClassID = &req.Msg.ClassId
	}
	if req.Msg.ClassScheduleId > 0 {
		model.ClassScheduleID = &req.Msg.ClassScheduleId
	}
	if err := s.db.WithContext(ctx).Create(&model).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Fetch back with user join
	var row attendanceRow
	result := s.db.WithContext(ctx).
		Raw(attendanceJoinSQL+`WHERE a.id = ?`, model.ID).
		Scan(&row)
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("user not found"))
	}

	return connect.NewResponse(&attendancev1.CreateAttendanceResponse{
		Record: row.toProto(),
	}), nil
}
