"""update detection_log schema

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-01 00:00:00.000000
"""
from __future__ import annotations

from typing import Callable

revision:      str       = "0002"
down_revision: str | None = "0001"
branch_labels: str | None = None
depends_on:    str | None = None


def upgrade(execute: Callable[[str], None]) -> None:
    execute("DROP TABLE IF EXISTS detection_log")
    execute("""
        CREATE TABLE IF NOT EXISTS detection_log
        (
            session_id   String,
            class_id     Int64,
            student_id   String,
            class_name   String,
            student_name String,
            seen_at      DateTime
        )
        ENGINE = MergeTree()
        ORDER BY (session_id, seen_at)
    """)


def downgrade(execute: Callable[[str], None]) -> None:
    execute("DROP TABLE IF EXISTS detection_log")
    execute("""
        CREATE TABLE IF NOT EXISTS detection_log
        (
            session_id      String,
            person_id       String,
            name            String,
            first_seen_at   DateTime,
            last_seen_at    DateTime,
            detection_count UInt32,
            inserted_at     DateTime DEFAULT now()
        )
        ENGINE = ReplacingMergeTree(last_seen_at)
        ORDER BY (session_id, person_id)
    """)
