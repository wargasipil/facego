"""
Alembic migration environment — ClickHouse via clickhouse-sqlalchemy.
Connection URL is built at runtime from config.yaml (or DEFAULT_CONFIG).
"""

from __future__ import annotations

from logging.config import fileConfig
from pathlib import Path

import yaml
from alembic import context
from alembic.ddl.impl import DefaultImpl
from sqlalchemy import create_engine, pool


# ── Register ClickHouse DDL implementation with Alembic ──────────────────────
# clickhouse-sqlalchemy provides the SQLAlchemy dialect but does not register
# an Alembic DDL impl — we do it here so context.configure() works.
class ClickHouseImpl(DefaultImpl):
    __dialect__      = "clickhouse"
    transactional_ddl = False

# ── Load config.yaml (same logic as app.py) ──────────────────────────────────
_CONFIG_PATH = Path(__file__).parent.parent / "config.yaml"

_DEFAULT_CH = {
    "host":           "localhost",
    "port":           8123,
    "database":       "facego",
    "username":       "facego",
    "password":       "facego_secret",
}

def _load_ch_config() -> dict:
    if _CONFIG_PATH.exists():
        with open(_CONFIG_PATH) as f:
            cfg = yaml.safe_load(f) or {}
        ch = cfg.get("clickhouse", {})
        return {**_DEFAULT_CH, **ch}
    return _DEFAULT_CH.copy()

_ch = _load_ch_config()
DB_URL = (
    f"clickhouse+http://{_ch['username']}:{_ch['password']}"
    f"@{_ch['host']}:{_ch['port']}/{_ch['database']}"
)

# ── Alembic boilerplate ───────────────────────────────────────────────────────
alembic_cfg = context.config
if alembic_cfg.config_file_name:
    fileConfig(alembic_cfg.config_file_name)

target_metadata = None   # no SQLAlchemy models — migrations use raw SQL


def run_migrations_offline() -> None:
    context.configure(
        url=DB_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(DB_URL, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
