import csv
from datetime import datetime
from pathlib import Path

from textual.app import ComposeResult
from textual.containers import Container, Horizontal
from textual.screen import ModalScreen
from textual.widgets import Button, DataTable, Label
from textual import on

from ch_logger import DetectionEntry


class DetectionLogScreen(ModalScreen):

    CSS = """
    DetectionLogScreen { align: center middle; }
    #log-box {
        width: 110; height: 40;
        border: thick $accent; background: #0d1117; padding: 1 2;
    }
    #log-screen-title {
        text-style: bold; color: #58a6ff; text-align: center;
        border-bottom: solid #30363d; padding-bottom: 1; margin-bottom: 1;
    }
    #log-table-area {
        height: 1fr; border: round #30363d; background: #0d1117; margin-bottom: 1;
    }
    DataTable   { height: 1fr; background: #0d1117; }
    #log-summary {
        height: 2; color: #8b949e; text-align: center;
        border-top: solid #30363d; padding-top: 1;
    }
    #log-btn-row { height: 3; margin-bottom: 1; }
    #log-btn-row Button { margin: 0 1; width: 1fr; }
    #export-status { height: 2; color: #3fb950; text-align: center; }
    """

    def __init__(self, session_log: list[DetectionEntry], class_name: str = ""):
        super().__init__()
        self._session_log = session_log
        self._class_name  = class_name

    def compose(self) -> ComposeResult:
        title = f"📊  Detection Log  —  {self._class_name}" if self._class_name else "📊  Detection Log"
        with Container(id="log-box"):
            yield Label(title, id="log-screen-title")
            with Container(id="log-table-area"):
                yield DataTable(id="log-table", cursor_type="row", zebra_stripes=True)
            with Horizontal(id="log-btn-row"):
                yield Button("💾  Export CSV", variant="success", id="btn-export")
                yield Button("✖   Close",      variant="default", id="btn-log-close")
            yield Label("", id="export-status")
            yield Label("", id="log-summary")

    def on_mount(self):
        self._build_table()

    def _build_table(self):
        table = self.query_one("#log-table", DataTable)
        table.clear(columns=True)
        table.add_columns("Student ID", "Student Name", "Class", "Seen At")
        if not self._session_log:
            self.query_one("#log-summary", Label).update("No detections in this session yet.")
            return
        for entry in self._session_log:
            table.add_row(entry.student_id, entry.student_name,
                          entry.class_name, entry.seen_at)
        unique = len({e.student_id for e in self._session_log})
        self.query_one("#log-summary", Label).update(
            f"{len(self._session_log)} appearance(s)  ·  {unique} unique student(s)")

    @on(Button.Pressed, "#btn-export")
    def on_export(self):
        if not self._session_log:
            self.query_one("#export-status", Label).update("⚠ Nothing to export.")
            return
        out_path = Path(f"detection_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["student_id", "student_name", "class_name", "seen_at"])
            for entry in self._session_log:
                writer.writerow([entry.student_id, entry.student_name,
                                 entry.class_name, entry.seen_at])
        self.query_one("#export-status", Label).update(
            f"✅ Exported  {len(self._session_log)} row(s)  →  {out_path.resolve()}")

    @on(Button.Pressed, "#btn-log-close")
    def on_close(self): self.dismiss(None)
