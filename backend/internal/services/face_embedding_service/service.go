package face_embedding_service

import (
	"context"

	"connectrpc.com/connect"
	facesv1 "github.com/wargasipil/facego/gen/faces/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Service struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Service {
	return &Service{db: db}
}

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

func (s *Service) ListFaceEmbeddings(
	ctx context.Context,
	_ *connect.Request[facesv1.ListFaceEmbeddingsRequest],
) (*connect.Response[facesv1.ListFaceEmbeddingsResponse], error) {
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
	return connect.NewResponse(&facesv1.ListFaceEmbeddingsResponse{Records: records}), nil
}

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
