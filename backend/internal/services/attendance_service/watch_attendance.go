package attendance_service

import (
	"context"

	"connectrpc.com/connect"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
)

// WatchAttendance streams real-time recognition events.
// Full implementation requires integration with the face recognition service.
func (s *Service) WatchAttendance(
	ctx context.Context,
	req *connect.Request[attendancev1.WatchAttendanceRequest],
	stream *connect.ServerStream[attendancev1.WatchAttendanceResponse],
) error {
	return connect.NewError(connect.CodeUnimplemented, nil)
}
