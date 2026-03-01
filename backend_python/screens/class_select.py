from textual.app import ComposeResult
from textual.containers import Container, Horizontal
from textual.screen import ModalScreen
from textual.widgets import Button, DataTable, Input, Label
from textual import on, work

from backend_client import get_backend_client


class ClassSelectScreen(ModalScreen):
    """Select which class is being attended before starting detection."""

    CSS = """
    ClassSelectScreen { align: center middle; }
    #cls-box {
        width: 70; height: auto; max-height: 80vh;
        border: thick $accent; background: #161b22; padding: 2 4;
    }
    #cls-title   { text-style: bold; color: #58a6ff; text-align: center; margin-bottom: 1; }
    #search-row  { height: 3; margin-bottom: 1; }
    .cls-lbl     { color: #8b949e; width: 14; content-align: left middle; }
    #inp-search  { width: 1fr; }
    #btn-search  { margin-left: 1; min-width: 10; }
    #cls-table   { height: 10; margin-bottom: 1; }
    #lbl-status  { color: #8b949e; height: 1; margin-bottom: 1; }
    #lbl-sel     { color: #3fb950; height: 1; margin-bottom: 1; }
    #btn-row     { height: auto; margin-top: 1; }
    Button       { margin: 0 1; }
    """

    def __init__(self):
        super().__init__()
        self._selected:   dict | None = None   # {"class_id": int, "class_name": str}
        self._class_list: list[dict]  = []

    def compose(self) -> ComposeResult:
        with Container(id="cls-box"):
            yield Label("🏫  Select Class for This Session", id="cls-title")
            with Horizontal(id="search-row"):
                yield Label("Search class", classes="cls-lbl")
                yield Input(placeholder="Class name…", id="inp-search")
                yield Button("Search", id="btn-search")
            tbl = DataTable(id="cls-table", cursor_type="row", zebra_stripes=True)
            tbl.add_columns("ID", "Class Name")
            yield tbl
            yield Label("Loading classes…", id="lbl-status")
            yield Label("", id="lbl-sel")
            with Horizontal(id="btn-row"):
                yield Button("Start Detection", variant="success", id="btn-start", disabled=True)
                yield Button("Cancel",          variant="error",   id="btn-cancel")

    def on_mount(self):
        self._load_classes("")

    @on(Button.Pressed, "#btn-cancel")
    def cancel(self): self.dismiss(None)

    @on(Button.Pressed, "#btn-search")
    @on(Input.Submitted, "#inp-search")
    def trigger_search(self):
        q = self.query_one("#inp-search", Input).value.strip()
        self._load_classes(q)

    @work(thread=True)
    def _load_classes(self, search: str):
        self.app.call_from_thread(
            self.query_one("#lbl-status", Label).update, "🔍 Loading…")
        try:
            classes = get_backend_client().list_classes(search=search)
        except Exception as e:
            self.app.call_from_thread(
                self.query_one("#lbl-status", Label).update, f"⚠ Backend error: {e}")
            return

        self._class_list = classes
        tbl = self.query_one("#cls-table", DataTable)
        self.app.call_from_thread(tbl.clear)
        for c in self._class_list:
            self.app.call_from_thread(tbl.add_row, str(c["id"]), c["name"], key=str(c["id"]))
        msg = f"{len(classes)} class(es) found" if classes else "No classes found"
        self.app.call_from_thread(self.query_one("#lbl-status", Label).update, msg)

    @on(DataTable.RowSelected, "#cls-table")
    def on_class_selected(self, event: DataTable.RowSelected):
        cid = int(event.row_key.value)
        match = next((c for c in self._class_list if c["id"] == cid), None)
        if not match:
            return
        self._selected = {"class_id": match["id"], "class_name": match["name"]}
        self.query_one("#lbl-sel",   Label).update(f"✔ Selected: {match['name']}")
        self.query_one("#btn-start", Button).disabled = False

    @on(Button.Pressed, "#btn-start")
    def start(self):
        if self._selected:
            self.dismiss(self._selected)
