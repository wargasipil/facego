package face_embedding_service

import (
	"context"

	"connectrpc.com/connect"
	facesv1 "github.com/wargasipil/facego/gen/faces/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"gorm.io/gorm/clause"
)

func (s *Service) UpsertFaceEmbeddings(
	ctx context.Context,
	req *connect.Request[facesv1.UpsertFaceEmbeddingsRequest],
) (*connect.Response[facesv1.UpsertFaceEmbeddingsResponse], error) {
	r := req.Msg.Record
	row := db_models.FaceEmbedding{
		StudentID:      r.StudentId,
		Embeddings:     r.Embeddings,
		EmbeddingCount: r.EmbeddingCount,
	}
	err := s.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "student_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"embeddings", "embedding_count", "updated_at"}),
		}).
		Create(&row).Error
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&facesv1.UpsertFaceEmbeddingsResponse{}), nil
}
