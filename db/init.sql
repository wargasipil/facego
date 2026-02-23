-- FaceGo Attendance — initial schema
-- Requires pgvector extension (bundled in pgvector/pgvector image)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Grades ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS grades (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    level       VARCHAR(10) NOT NULL UNIQUE,   -- e.g. "10"
    label       VARCHAR(64) NOT NULL,          -- e.g. "Grade 10"
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Classes ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS classes (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(32) NOT NULL UNIQUE,   -- e.g. "10-A"
    grade_level VARCHAR(10) NOT NULL REFERENCES grades(level) ON DELETE RESTRICT,
    teacher_id  UUID,                          -- FK set after teachers table
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Teachers ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teachers (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id  VARCHAR(32)  NOT NULL UNIQUE,
    name        VARCHAR(128) NOT NULL,
    subject     VARCHAR(64)  NOT NULL,
    email       VARCHAR(128) NOT NULL UNIQUE,
    phone       VARCHAR(32)  NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE classes
    ADD CONSTRAINT fk_classes_teacher
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- ─── Users (students) ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id    VARCHAR(32)  NOT NULL UNIQUE,
    name          VARCHAR(128) NOT NULL,
    class_name    VARCHAR(32)  NOT NULL REFERENCES classes(name) ON DELETE RESTRICT,
    email         VARCHAR(128),
    photo_url     TEXT,
    -- 512-dim face embedding stored as pgvector (adjust dim to your model)
    face_embedding vector(512),
    registered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_face_embedding
    ON users USING ivfflat (face_embedding vector_cosine_ops)
    WITH (lists = 100);

-- ─── Attendance ───────────────────────────────────────────────────────────────

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');

CREATE TABLE IF NOT EXISTS attendance (
    id         UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     attendance_status  NOT NULL DEFAULT 'present',
    photo_url  TEXT,
    timestamp  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id  ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp DESC);
