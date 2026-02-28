"""create detection_log table

Revision ID: 0001
Revises:
Create Date: 2026-02-25 00:00:00.000000
"""
from __future__ import annotations

from typing import Callable

revision:      str       = "0001"
down_revision: str | None = None
branch_labels: str | None = None
depends_on:    str | None = None


def upgrade(execute: Callable[[str], None]) -> None:
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


def downgrade(execute: Callable[[str], None]) -> None:
    execute("DROP TABLE IF EXISTS detection_log")
