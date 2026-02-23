package class_service

import (
	"context"

	"connectrpc.com/connect"
	classesv1 "github.com/wargasipil/facego/gen/classes/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) EnrollStudent(
	ctx context.Context,
	req *connect.Request[classesv1.EnrollStudentRequest],
) (*connect.Response[classesv1.EnrollStudentResponse], error) {
	enrollment := db_models.ClassEnrollment{
		ClassID: uint(req.Msg.ClassId),
		UserID:  uint(req.Msg.UserId),
	}
	// ON CONFLICT DO NOTHING — idempotent, duplicate enrollments are silently ignored.
	if err := s.db.WithContext(ctx).
		Where(db_models.ClassEnrollment{ClassID: enrollment.ClassID, UserID: enrollment.UserID}).
		FirstOrCreate(&enrollment).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&classesv1.EnrollStudentResponse{}), nil
}
