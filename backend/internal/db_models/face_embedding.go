package db_models

import "time"

// FaceEmbedding stores all face embeddings for a single registered student.
// student_id is the backend user ID (FK → users.id) used as the unique key.
// Embeddings are packed as EmbeddingCount * 512 float32 values (little-endian, flat).
type FaceEmbedding struct {
	ID             int64     `gorm:"primaryKey;column:id;autoIncrement"`
	StudentID      int64     `gorm:"column:student_id;not null;uniqueIndex"`
	Embeddings     []byte    `gorm:"column:embeddings;not null;type:bytea"`
	EmbeddingCount int32     `gorm:"column:embedding_count;not null"`
	CreatedAt      time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (FaceEmbedding) TableName() string { return "face_embeddings" }
