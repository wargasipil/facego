package face_embedding_service

import (
	"context"
	"strings"

	"connectrpc.com/connect"
	facesv1 "github.com/wargasipil/facego/gen/faces/v1"
	db_models "github.com/wargasipil/facego/internal/db_models"
)

const defaultPageSize = 20

func (s *Service) ListFaceEmbeddings(
	ctx context.Context,
	req *connect.Request[facesv1.ListFaceEmbeddingsRequest],
) (*connect.Response[facesv1.ListFaceEmbeddingsResponse], error) {
	msg := req.Msg

	pageSize := int(msg.PageSize)
	if pageSize <= 0 {
		pageSize = defaultPageSize
	}
	offset := 0
	if msg.Page > 0 {
		offset = int(msg.Page) * pageSize
	}

	q := strings.TrimSpace(msg.Q)

	db := s.db.WithContext(ctx).
		Model(&db_models.FaceEmbedding{}).
		Joins("JOIN users ON users.id = face_embeddings.student_id")

	if q != "" {
		like := "%" + q + "%"
		db = db.Where("users.name ILIKE ? OR users.student_id ILIKE ?", like, like)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	var rows []db_models.FaceEmbedding
	if err := db.
		Select("face_embeddings.*").
		Order("users.name ASC").
		Limit(pageSize).
		Offset(offset).
		Find(&rows).Error; err != nil {
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
	return connect.NewResponse(&facesv1.ListFaceEmbeddingsResponse{
		Records: records,
		Total:   int32(total),
	}), nil
}
