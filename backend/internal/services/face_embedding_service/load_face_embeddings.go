package face_embedding_service

import (
	"context"

	"connectrpc.com/connect"
	facesv1 "github.com/wargasipil/facego/gen/faces/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

func (s *Service) LoadFaceEmbeddings(
	ctx context.Context,
	_ *connect.Request[facesv1.LoadFaceEmbeddingsRequest],
) (*connect.Response[facesv1.LoadFaceEmbeddingsResponse], error) {
	var rows []db_models.FaceEmbedding
	if err := s.db.WithContext(ctx).Find(&rows).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	records := make([]*facesv1.FaceRecord, 0, len(rows))
	for _, row := range rows {
		records = append(records, &facesv1.FaceRecord{
			StudentId:      row.StudentID,
			Embeddings:     row.Embeddings,
			EmbeddingCount: row.EmbeddingCount,
		})
	}
	return connect.NewResponse(&facesv1.LoadFaceEmbeddingsResponse{
		Records: records,
	}), nil
}
