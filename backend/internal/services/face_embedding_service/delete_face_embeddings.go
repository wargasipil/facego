package face_embedding_service

import (
	"context"

	"connectrpc.com/connect"
	facesv1 "github.com/wargasipil/facego/gen/faces/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) DeleteFaceEmbeddings(
	ctx context.Context,
	req *connect.Request[facesv1.DeleteFaceEmbeddingsRequest],
) (*connect.Response[facesv1.DeleteFaceEmbeddingsResponse], error) {
	err := s.db.WithContext(ctx).
		Where("student_id = ?", req.Msg.StudentId).
		Delete(&db_models.FaceEmbedding{}).Error
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&facesv1.DeleteFaceEmbeddingsResponse{}), nil
}
