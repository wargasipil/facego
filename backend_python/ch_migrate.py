"""
Lightweight Alembic-compatible migration runner for ClickHouse.
===============================================================
Uses clickhouse-connect directly — no SQLAlchemy DDL compilation needed.

Migration files live in alembic/versions/ and follow Alembic conventions:

    revision      = "0001"
    down_revision = None          # or the previous revision string
    branch_labels = None
    depends_on    = None

    def upgrade(execute) -> None:
        execute("CREATE TABLE ...")

    def downgrade(execute) -> None:
        execute("DROP TABLE ...")

`execute(sql)` is a callback that runs a command via clickhouse-connect.

CLI usage:
    uv run python ch_migrate.py upgrade head
    uv run python ch_migrate.py downgrade -1
    uv run python ch_migrate.py current
    uv run python ch_migrate.py history
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Callable

try:
    import clickhouse_connect
except ImportError:
    clickhouse_connect = None  # type: ignore

import yaml

_VERSIONS_DIR  = Path(__file__).parent / "alembic" / "versions"
_CONFIG_PATH   = Path(__file__).parent / "config.yaml"

_DEFAULT_CH = {
    "host":     "localhost",
    "port":     8123,
    "database": "facego",
    "username": "facego",
    "password": "facego_secret",
}

_CREATE_MIGRATIONS_TABLE = """
    CREATE TABLE IF NOT EXISTS schema_migrations
    (
        revision   String,
        applied_at DateTime DEFAULT now()
    )
    ENGINE = ReplacingMergeTree(applied_at)
    ORDER BY revision
"""


# ── Config helpers ────────────────────────────────────────────────────────────

def _load_ch_config() -> dict:
    if _CONFIG_PATH.exists():
        with open(_CONFIG_PATH) as f:
            cfg = yaml.safe_load(f) or {}
        return {**_DEFAULT_CH, **cfg.get("clickhouse", {})}
    return _DEFAULT_CH.copy()


# ── Migration file loader ─────────────────────────────────────────────────────

def _load_migration_modules() -> list[dict]:
    """
    Load all migration modules from alembic/versions/, resolve the chain
    starting from down_revision=None, and return an ordered list of:
        {"revision": str, "module": <module>}
    """
    raw: dict[str, object] = {}
    for path in sorted(_VERSIONS_DIR.glob("*.py")):
        if path.stem.startswith("__"):
            continue
        spec   = importlib.util.spec_from_file_location(path.stem, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        rev = getattr(module, "revision", None)
        if rev:
            raw[rev] = module

    # Build ordered chain: start from module with down_revision=None
    ordered = []
    next_rev: str | None = None
    # Map down_revision -> module to walk the chain
    by_down: dict[str | None, object] = {
        getattr(m, "down_revision", None): m for m in raw.values()
    }
    module = by_down.get(None)
    while module:
        rev = getattr(module, "revision")
        ordered.append({"revision": rev, "module": module})
        module = by_down.get(rev)

    return ordered


# ── Migration runner ──────────────────────────────────────────────────────────

class MigrationRunner:
    """Applies Alembic-style migration files against a ClickHouse connection."""

    def __init__(self, client):
        self._client = client
        self._ensure_migrations_table()

    def _ensure_migrations_table(self):
        self._client.command(_CREATE_MIGRATIONS_TABLE)

    def _get_applied(self) -> set[str]:
        result = self._client.query(
            "SELECT DISTINCT revision FROM schema_migrations"
        )
        return {row[0] for row in result.result_rows}

    def _execute(self, sql: str):
        self._client.command(sql)

    # ── public API ───────────────────────────────────────────────────

    def current(self) -> str | None:
        """Return the latest applied revision, or None."""
        applied = self._get_applied()
        migrations = _load_migration_modules()
        applied_in_order = [m for m in migrations if m["revision"] in applied]
        return applied_in_order[-1]["revision"] if applied_in_order else None

    def history(self) -> list[dict]:
        """Return all migrations with applied status."""
        applied = self._get_applied()
        return [
            {"revision": m["revision"], "applied": m["revision"] in applied}
            for m in _load_migration_modules()
        ]

    def upgrade(self, target: str = "head") -> list[str]:
        """Apply pending migrations up to `target` (revision string or 'head')."""
        applied     = self._get_applied()
        migrations  = _load_migration_modules()
        pending     = [m for m in migrations if m["revision"] not in applied]

        if target != "head":
            cutoff = next(
                (i for i, m in enumerate(migrations) if m["revision"] == target),
                None,
            )
            if cutoff is None:
                raise ValueError(f"Unknown revision: {target!r}")
            pending = [m for m in pending
                       if migrations.index(m) <= cutoff]

        ran = []
        for m in pending:
            m["module"].upgrade(self._execute)
            self._client.insert(
                "schema_migrations",
                [[m["revision"]]],
                column_names=["revision"],
            )
            ran.append(m["revision"])

        return ran

    def downgrade(self, target: str) -> list[str]:
        """Rollback migrations. target: revision string or '-N' (e.g. '-1')."""
        applied    = self._get_applied()
        migrations = _load_migration_modules()
        applied_in_order = [m for m in migrations if m["revision"] in applied]

        if target.startswith("-"):
            steps = int(target)          # e.g. -1
            to_rollback = applied_in_order[steps:]
        else:
            cutoff = next(
                (i for i, m in enumerate(applied_in_order)
                 if m["revision"] == target),
                None,
            )
            if cutoff is None:
                raise ValueError(f"Revision {target!r} not found in applied list.")
            to_rollback = applied_in_order[cutoff + 1:]

        ran = []
        for m in reversed(to_rollback):
            m["module"].downgrade(self._execute)
            self._client.command(
                f"ALTER TABLE schema_migrations DELETE "
                f"WHERE revision = '{m['revision']}'"
            )
            ran.append(m["revision"])

        return ran


# ── Standalone CLI ────────────────────────────────────────────────────────────

def _build_client():
    ch = _load_ch_config()
    return clickhouse_connect.get_client(
        host=ch["host"], port=ch["port"],
        database=ch["database"],
        username=ch["username"], password=ch["password"],
    )


def _cli():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)

    cmd = args[0]
    client  = _build_client()
    runner  = MigrationRunner(client)

    if cmd == "upgrade":
        target = args[1] if len(args) > 1 else "head"
        ran = runner.upgrade(target)
        if ran:
            for rev in ran:
                print(f"  INFO  [ch_migrate] Applied: {rev}")
        else:
            print("  INFO  [ch_migrate] Already up to date.")

    elif cmd == "downgrade":
        target = args[1] if len(args) > 1 else "-1"
        ran = runner.downgrade(target)
        if ran:
            for rev in ran:
                print(f"  INFO  [ch_migrate] Rolled back: {rev}")
        else:
            print("  INFO  [ch_migrate] Nothing to roll back.")

    elif cmd == "current":
        rev = runner.current()
        print(f"  INFO  [ch_migrate] Current revision: {rev or '(none)'}")

    elif cmd == "history":
        for entry in runner.history():
            mark = "[x]" if entry["applied"] else "[ ]"
            print(f"  {mark}  {entry['revision']}")

    else:
        print(f"Unknown command: {cmd!r}")
        print("Usage: python ch_migrate.py [upgrade|downgrade|current|history] [target]")
        sys.exit(1)

    client.close()


if __name__ == "__main__":
    _cli()
