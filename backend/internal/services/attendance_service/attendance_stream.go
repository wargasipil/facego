package attendance_service

import (
	"context"
	"errors"

	"connectrpc.com/connect"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
)

// AttendanceStream implements [attendancev1connect.AttendanceServiceHandler].
func (s *Service) AttendanceStream(
	ctx context.Context,
	req *connect.Request[attendancev1.AttendanceStreamRequest],
	stream *connect.ServerStream[attendancev1.AttendanceStreamResponse]) error {
	// var err error
	// db := s.db.WithContext(ctx)
	// pay := req.Msg

	// query := db.
	// 	Model(&db_models.Attendance{}).
	// 	Where("class_id = ?", pay.ClassId).
	// 	Where("").
	// 	Order("check_in_time desc")
	return errors.New("unimplemented")

}
