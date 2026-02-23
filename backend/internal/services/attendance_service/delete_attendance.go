package attendance_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) DeleteAttendance(
	ctx context.Context,
	req *connect.Request[attendancev1.DeleteAttendanceRequest],
) (*connect.Response[attendancev1.DeleteAttendanceResponse], error) {
	result := s.db.WithContext(ctx).
		Where("id = ?", req.Msg.Id).
		Delete(&db_models.Attendance{})
	if result.Error != nil {
		return nil, connect.NewError(connect.CodeInternal, result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, connect.NewError(connect.CodeNotFound, errors.New("attendance record not found"))
	}
	return connect.NewResponse(&attendancev1.DeleteAttendanceResponse{}), nil
}
