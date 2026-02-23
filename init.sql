CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS user_faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    embedding vector(512),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Optional index for cosine similarity
CREATE INDEX IF NOT EXISTS user_faces_embedding_idx
ON user_faces
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);