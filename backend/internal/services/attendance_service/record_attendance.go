package attendance_service

import (
	"context"

	"connectrpc.com/connect"
	attendancev1 "github.com/wargasipil/facego/gen/attendance/v1"
)

// RecordAttendance performs face recognition on the submitted frame.
// Full implementation requires integration with the face recognition service.
func (s *Service) RecordAttendance(
	ctx context.Context,
	req *connect.Request[attendancev1.RecordAttendanceRequest],
) (*connect.Response[attendancev1.RecordAttendanceResponse], error) {
	return nil, connect.NewError(connect.CodeUnimplemented, nil)
}
