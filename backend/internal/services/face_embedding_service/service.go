package face_embedding_service

import (
	facesv1connect "github.com/wargasipil/facego/gen/faces/v1/facesv1connect"
	"gorm.io/gorm"
)

// Service implements facesv1connect.FaceEmbeddingServiceHandler.
type Service struct {
	db *gorm.DB
}

var _ facesv1connect.FaceEmbeddingServiceHandler = (*Service)(nil)

func NewService(db *gorm.DB) facesv1connect.FaceEmbeddingServiceHandler {
	return &Service{db: db}
}
