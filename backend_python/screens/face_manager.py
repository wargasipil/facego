import os

from textual.app import ComposeResult
from textual.containers import Container, Horizontal
from textual.message import Message
from textual.screen import ModalScreen
from textual.widgets import Button, DataTable, Label
from textual import on

from config import faces_db_path
from face_engine import load_faces_db, make_record, save_faces_db
from screens.add_samples import AddSamplesScreen
from screens.confirm_delete import ConfirmDeleteScreen
from screens.edit_face import EditFaceScreen
from screens.register import RegisterScreen
from screens.view_face import ViewFaceScreen


class FaceManagerScreen(ModalScreen):

    CSS = """
    FaceManagerScreen { align: center middle; }
    #manager-box {
        width: 100; height: 44;
        border: thick $accent; background: #0d1117; padding: 1 2;
    }
    #manager-title {
        text-style: bold; color: #58a6ff; text-align: center;
        border-bottom: solid #30363d; padding-bottom: 1; margin-bottom: 1;
    }
    #table-area {
        height: 1fr; border: round #30363d; background: #0d1117; margin-bottom: 1;
    }
    DataTable { height: 1fr; background: #0d1117; }
    #btn-row-top, #btn-row-bot { height: 3; margin-bottom: 1; }
    #btn-row-top Button, #btn-row-bot Button { margin: 0 1; width: 1fr; }
    #status-bar {
        height: 2; color: #8b949e; text-align: center;
        border-top: solid #30363d; padding-top: 1;
    }
    """

    class DBChanged(Message):
        pass

    def compose(self) -> ComposeResult:
        with Container(id="manager-box"):
            yield Label("👥  Face Manager  —  CRUD", id="manager-title")
            with Container(id="table-area"):
                yield DataTable(id="face-table", cursor_type="row", zebra_stripes=True)
            with Horizontal(id="btn-row-top"):
                yield Button("➕  Register New", variant="primary", id="btn-create")
                yield Button("🔍  View Details", variant="default", id="btn-read")
                yield Button("✏   Edit",         variant="default", id="btn-edit")
                yield Button("📸  Add Samples",  variant="default", id="btn-add-samples")
            with Horizontal(id="btn-row-bot"):
                yield Button("🗑  Delete Selected", variant="error",   id="btn-delete")
                yield Button("💣  Delete All",      variant="error",   id="btn-delete-all")
                yield Button("✖   Close",           variant="default", id="btn-close")
            yield Label("Select a row, then choose an action.", id="status-bar")

    def on_mount(self):
        self._build_table()

    def _build_table(self):
        table = self.query_one("#face-table", DataTable)
        table.clear(columns=True)
        table.add_columns("Person ID", "Name", "Samples", "Created At")
        db = load_faces_db()
        if not db:
            self.query_one("#status-bar", Label).update("No faces registered yet.")
            return
        for pid in sorted(db.keys()):
            rec = db[pid]
            table.add_row(pid, rec.get("name", "—"),
                          str(len(rec.get("embeddings", []))),
                          rec.get("created_at", "—"), key=pid)
        self.query_one("#status-bar", Label).update(
            f"{len(db)} face(s) registered.  Select a row and choose an action.")

    def _selected_pid(self) -> str | None:
        table = self.query_one("#face-table", DataTable)
        if table.cursor_row < 0:
            return None
        return str(table.get_row_at(table.cursor_row)[0])

    def _status(self, msg: str):
        self.query_one("#status-bar", Label).update(msg)

    # ── Create ──────────────────────────────────────────────────────
    @on(Button.Pressed, "#btn-create")
    def on_create(self):
        def handle(result):
            if not isinstance(result, RegisterScreen.Registered): return
            db = load_faces_db()
            if result.pid in db:
                db[result.pid]["embeddings"].extend(result.embeddings)
                if result.user_id:
                    db[result.pid]["user_id"] = result.user_id
            else:
                db[result.pid] = make_record(result.pid, result.name,
                                             result.embeddings, result.user_id)
            save_faces_db(db)
            self._build_table()
            self._status(f"✅ Registered  [{result.pid}]  {result.name}.")
            self.post_message(self.DBChanged())
        self.app.push_screen(RegisterScreen(), handle)

    # ── Read ─────────────────────────────────────────────────────────
    @on(Button.Pressed, "#btn-read")
    def on_read(self):
        pid = self._selected_pid()
        if not pid:
            self._status("⚠ Select a row first."); return
        self.app.push_screen(ViewFaceScreen(pid, load_faces_db()))

    # ── Update: edit name / ID ───────────────────────────────────────
    @on(Button.Pressed, "#btn-edit")
    def on_edit(self):
        pid = self._selected_pid()
        if not pid:
            self._status("⚠ Select a row first."); return
        db = load_faces_db()

        def handle(result):
            if not isinstance(result, EditFaceScreen.Updated): return
            db2 = load_faces_db()
            record = db2.pop(result.old_pid)
            record["person_id"] = result.new_pid
            record["name"]      = result.new_name
            db2[result.new_pid] = record
            save_faces_db(db2)
            self._build_table()
            self._status(f"✅ Updated  [{result.old_pid}→{result.new_pid}]  {result.new_name}.")
            self.post_message(self.DBChanged())
        self.app.push_screen(EditFaceScreen(pid, db), handle)

    # ── Update: add more samples ─────────────────────────────────────
    @on(Button.Pressed, "#btn-add-samples")
    def on_add_samples(self):
        pid = self._selected_pid()
        if not pid:
            self._status("⚠ Select a row first."); return
        db   = load_faces_db()
        name = db[pid].get("name", pid)

        def handle(result):
            if not isinstance(result, AddSamplesScreen.SamplesAdded): return
            db2 = load_faces_db()
            db2[result.pid]["embeddings"].extend(result.embeddings)
            save_faces_db(db2)
            self._build_table()
            self._status(f"✅ Added {len(result.embeddings)} samples to [{result.pid}].")
            self.post_message(self.DBChanged())
        self.app.push_screen(AddSamplesScreen(pid, name), handle)

    # ── Delete: single ───────────────────────────────────────────────
    @on(Button.Pressed, "#btn-delete")
    def on_delete(self):
        pid = self._selected_pid()
        if not pid:
            self._status("⚠ Select a row first."); return
        name = load_faces_db()[pid].get("name", pid)

        def handle(confirmed: bool):
            if not confirmed: return
            db2 = load_faces_db()
            db2.pop(pid, None)
            save_faces_db(db2)
            self._build_table()
            self._status(f"🗑 Deleted  [{pid}]  {name}.")
            self.post_message(self.DBChanged())
        self.app.push_screen(
            ConfirmDeleteScreen(f"Delete record for:\n[{pid}]  {name}?"), handle)

    # ── Delete: all ──────────────────────────────────────────────────
    @on(Button.Pressed, "#btn-delete-all")
    def on_delete_all(self):
        def handle(confirmed: bool):
            if not confirmed: return
            path = faces_db_path()
            if os.path.exists(path): os.remove(path)
            self._build_table()
            self._status("💣 All face records deleted.")
            self.post_message(self.DBChanged())
        self.app.push_screen(
            ConfirmDeleteScreen("Delete ALL registered faces?\nThis cannot be undone."), handle)

    @on(Button.Pressed, "#btn-close")
    def on_close(self): self.dismiss(None)
