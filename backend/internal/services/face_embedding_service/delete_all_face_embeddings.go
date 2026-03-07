package face_embedding_service

import (
	"context"

	"connectrpc.com/connect"
	facesv1 "github.com/wargasipil/facego/gen/faces/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) DeleteAllFaceEmbeddings(
	ctx context.Context,
	_ *connect.Request[facesv1.DeleteAllFaceEmbeddingsRequest],
) (*connect.Response[facesv1.DeleteAllFaceEmbeddingsResponse], error) {
	err := s.db.WithContext(ctx).
		Where("1 = 1").
		Delete(&db_models.FaceEmbedding{}).Error
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&facesv1.DeleteAllFaceEmbeddingsResponse{}), nil
}
