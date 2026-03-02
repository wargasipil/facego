"""
ClickHouse — migration runner and detection logger.
"""

import importlib.util
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

try:
    import clickhouse_connect
    CLICKHOUSE_AVAILABLE = True
except ImportError:
    clickhouse_connect   = None  # type: ignore
    CLICKHOUSE_AVAILABLE = False

# ── Migration runner ──────────────────────────────────────────────────────────

_VERSIONS_DIR = Path(__file__).parent / "alembic" / "versions"

_CREATE_SCHEMA_MIGRATIONS = """
    CREATE TABLE IF NOT EXISTS schema_migrations
    (
        revision   String,
        applied_at DateTime DEFAULT now()
    )
    ENGINE = ReplacingMergeTree(applied_at)
    ORDER BY revision
"""


def _load_migrations() -> list[dict]:
    """Load migration modules from alembic/versions/ and return them in chain order."""
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

    # Walk the linked list: down_revision=None → first, then chain by revision
    by_down = {getattr(m, "down_revision", None): m for m in raw.values()}
    ordered, module = [], by_down.get(None)
    while module:
        rev = getattr(module, "revision")
        ordered.append({"revision": rev, "module": module})
        module = by_down.get(rev)
    return ordered


class MigrationRunner:
    """Applies Alembic-style migration files against a ClickHouse connection."""

    def __init__(self, client):
        self._client = client
        self._client.command(_CREATE_SCHEMA_MIGRATIONS)

    def _applied(self) -> set[str]:
        result = self._client.query("SELECT DISTINCT revision FROM schema_migrations")
        return {row[0] for row in result.result_rows}

    def _execute(self, sql: str):
        self._client.command(sql)

    def upgrade(self, target: str = "head") -> list[str]:
        """Apply pending migrations up to target ('head' or a revision string)."""
        applied    = self._applied()
        migrations = _load_migrations()
        pending    = [m for m in migrations if m["revision"] not in applied]

        if target != "head":
            cutoff = next((i for i, m in enumerate(migrations)
                           if m["revision"] == target), None)
            if cutoff is None:
                raise ValueError(f"Unknown revision: {target!r}")
            pending = [m for m in pending if migrations.index(m) <= cutoff]

        ran = []
        for m in pending:
            m["module"].upgrade(self._execute)
            self._client.insert("schema_migrations", [[m["revision"]]],
                                column_names=["revision"])
            ran.append(m["revision"])
        return ran

    def downgrade(self, target: str) -> list[str]:
        """Rollback migrations. target: revision string or '-N' (e.g. '-1')."""
        applied          = self._applied()
        migrations       = _load_migrations()
        applied_in_order = [m for m in migrations if m["revision"] in applied]

        if target.startswith("-"):
            to_rollback = applied_in_order[int(target):]
        else:
            cutoff = next((i for i, m in enumerate(applied_in_order)
                           if m["revision"] == target), None)
            if cutoff is None:
                raise ValueError(f"Revision {target!r} not in applied list.")
            to_rollback = applied_in_order[cutoff + 1:]

        ran = []
        for m in reversed(to_rollback):
            m["module"].downgrade(self._execute)
            self._client.command(
                f"ALTER TABLE schema_migrations DELETE WHERE revision = '{m['revision']}'"
            )
            ran.append(m["revision"])
        return ran


# ── Detection entry ───────────────────────────────────────────────────────────

_DT_FMT = "%Y-%m-%d %H:%M:%S"


@dataclass
class DetectionEntry:
    """One appearance event: a known student seen during a class session."""
    class_id:     int
    student_id:   str
    class_name:   str
    student_name: str
    seen_at:      str   # "YYYY-MM-DD HH:MM:SS"


def now_ts() -> str:
    return datetime.now(tz=timezone.utc).strftime(_DT_FMT)


# ── ClickHouse logger ─────────────────────────────────────────────────────────

_CH_COLUMNS = ["session_id", "class_id", "student_id",
               "class_name", "student_name", "seen_at"]


class ClickHouseLogger:
    """Opens a ClickHouse connection, runs migrations, and bulk-inserts detection rows."""

    def __init__(self, host: str, port: int, database: str,
                 username: str, password: str):
        self.session_id = str(uuid.uuid4())
        self._host      = host
        self._port      = port
        self._database  = database
        self._username  = username
        self._password  = password
        self._client    = None

    def connect(self):
        """Open connection and apply any pending migrations."""
        self._client = clickhouse_connect.get_client(
            host=self._host, port=self._port,
            database=self._database,
            username=self._username, password=self._password,
        )
        MigrationRunner(self._client).upgrade("head")

    def bulk_insert(self, entries: list) -> int:
        """Bulk-insert DetectionEntry objects into detection_log. Returns row count."""
        if not self._client or not entries:
            return 0
        rows = [
            [
                self.session_id,
                e.class_id,
                e.student_id,
                e.class_name,
                e.student_name,
                datetime.strptime(e.seen_at, _DT_FMT),
            ]
            for e in entries
        ]
        self._client.insert("detection_log", rows, column_names=_CH_COLUMNS)
        return len(rows)

    def close(self):
        if self._client:
            self._client.close()
            self._client = None
