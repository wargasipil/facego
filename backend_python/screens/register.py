import time

import cv2

from textual.app import ComposeResult
from textual.containers import Container, Horizontal
from textual.message import Message
from textual.screen import ModalScreen
from textual.widgets import Button, DataTable, Input, Label, ProgressBar
from textual import on, work

from backend_client import get_backend_client
from config import camera_index, capture_samples
from face_engine import draw_face_box, get_face_app, load_faces_db, validate_person_id


class RegisterScreen(ModalScreen):

    CSS = """
    RegisterScreen { align: center middle; }
    #register-box {
        width: 80; height: auto; max-height: 90vh;
        border: thick $accent; background: #161b22; padding: 2 4;
    }
    #register-title  { text-style: bold; color: #58a6ff; text-align: center; margin-bottom: 1; }
    #search-row      { height: 3; margin-bottom: 1; }
    .search-label    { color: #8b949e; width: 18; content-align: left middle; }
    #inp-search      { width: 1fr; }
    #btn-search      { margin-left: 1; min-width: 10; }
    #tbl-students    { height: 8; margin-bottom: 1; }
    #lbl-selected    { color: #3fb950; height: 1; margin-bottom: 1; }
    #lbl-sel-error   { color: #f85149; height: 1; margin-bottom: 1; }
    #status-label    { text-align: center; color: #8b949e; margin: 1 0; height: 2; }
    #btn-row         { margin-top: 1; height: auto; }
    Button           { margin: 0 1; }
    """

    class Registered(Message):
        def __init__(self, pid: str, name: str, embeddings: list, user_id: str = ""):
            super().__init__()
            self.pid        = pid
            self.name       = name
            self.embeddings = embeddings
            self.user_id    = user_id   # backend integer user ID for attendance sync

    def __init__(self):
        super().__init__()
        self._selected: dict | None = None   # selected student from backend
        self._students: dict        = {}      # backend_id -> user dict

    def compose(self) -> ComposeResult:
        with Container(id="register-box"):
            yield Label("📷  Register New Face", id="register-title")
            with Horizontal(id="search-row"):
                yield Label("Search Student", classes="search-label")
                yield Input(placeholder="Name or student ID…", id="inp-search")
                yield Button("Search", id="btn-search")
            tbl = DataTable(id="tbl-students", cursor_type="row", zebra_stripes=True)
            tbl.add_columns("Student ID", "Name", "Email")
            yield tbl
            yield Label("No student selected — search and click a row", id="lbl-selected")
            yield Label("", id="lbl-sel-error")
            yield Label("", id="status-label")
            yield ProgressBar(total=capture_samples(), id="progress", show_eta=False)
            with Horizontal(id="btn-row"):
                yield Button("Capture", variant="primary", id="btn-capture", disabled=True)
                yield Button("Cancel",  variant="error",   id="btn-cancel")

    @on(Button.Pressed, "#btn-cancel")
    def cancel(self): self.dismiss(None)

    @on(Button.Pressed, "#btn-search")
    @on(Input.Submitted, "#inp-search")
    def trigger_search(self):
        q = self.query_one("#inp-search", Input).value.strip()
        self._do_search(q)

    @work(thread=True)
    def _do_search(self, query: str):
        self.app.call_from_thread(
            self.query_one("#lbl-selected", Label).update, "🔍 Searching…")
        try:
            data = get_backend_client().list_users(search=query, page_size=20)
        except Exception as e:
            self.app.call_from_thread(
                self.query_one("#lbl-selected", Label).update, f"⚠ Backend error: {e}")
            return

        users          = data   # list_users() returns list[dict] directly
        self._students = {str(u.get("id", "")): u for u in users}

        tbl = self.query_one("#tbl-students", DataTable)
        self.app.call_from_thread(tbl.clear)
        for u in users:
            self.app.call_from_thread(
                tbl.add_row,
                u.get("studentId", ""),
                u.get("name", ""),
                u.get("email", ""),
                key=str(u.get("id", "")),
            )
        msg = f"{len(users)} student(s) found" if users else "No students found"
        self.app.call_from_thread(
            self.query_one("#lbl-selected", Label).update, msg)

    @on(DataTable.RowSelected, "#tbl-students")
    def on_student_selected(self, event: DataTable.RowSelected):
        bid        = str(event.row_key.value)
        u          = self._students.get(bid, {})
        student_id = u.get("studentId", "")
        name       = u.get("name", "")

        db   = load_faces_db()
        err  = validate_person_id(student_id, db)
        lbl  = self.query_one("#lbl-selected",  Label)
        lerr = self.query_one("#lbl-sel-error", Label)
        btn  = self.query_one("#btn-capture",   Button)

        if err:
            lerr.update(f"⚠ {err}")
            lbl.update(f"{student_id} — {name}")
            btn.disabled   = True
            self._selected = None
        else:
            lerr.update("")
            lbl.update(f"✔ Selected: {name}  [{student_id}]")
            btn.disabled   = False
            self._selected = u

    @on(Button.Pressed, "#btn-capture")
    def start_capture(self):
        if not self._selected:
            return
        pid     = self._selected.get("studentId", "")
        name    = self._selected.get("name", "")
        user_id = self._selected.get("id", "")   # backend integer user ID

        self.query_one("#btn-capture", Button).disabled = True
        self.query_one("#btn-search",  Button).disabled = True
        self.query_one("#inp-search",  Input).disabled  = True
        self._run_capture(pid, name, user_id)

    @work(thread=True)
    def _run_capture(self, pid: str, name: str, user_id: str = ""):
        status   = self.query_one("#status-label", Label)
        progress = self.query_one("#progress", ProgressBar)
        samples  = capture_samples()

        self.app.call_from_thread(status.update, "⏳ Loading InsightFace model…")
        try:
            fa = get_face_app()
        except Exception as e:
            self.app.call_from_thread(status.update, f"❌ Model error: {e}")
            return

        self.app.call_from_thread(status.update, "📷 Preview window opening…")
        cap = cv2.VideoCapture(camera_index())
        if not cap.isOpened():
            self.app.call_from_thread(status.update, "❌ Cannot open camera.")
            self.app.call_from_thread(
                self.query_one("#btn-capture", Button).__setattr__, "disabled", False)
            return

        collected, attempts = [], 0
        win = "Register Face — Preview"
        cv2.namedWindow(win, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(win, 640, 480)

        while len(collected) < samples and attempts < samples * 8:
            ret, frame = cap.read()
            attempts += 1
            if not ret:
                continue
            display = frame.copy()
            faces   = fa.get(frame)
            if faces:
                face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]))
                draw_face_box(display, face.bbox, f"Capturing {len(collected)+1}/{samples}")
                if face.embedding is not None:
                    collected.append(face.embedding.copy())
                    self.app.call_from_thread(
                        status.update, f"✅ Sample {len(collected)}/{samples}…")
                    self.app.call_from_thread(progress.advance, 1)
                    time.sleep(0.15)
            else:
                cv2.putText(display, "No face detected — move closer",
                            (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 80, 220), 2)
                self.app.call_from_thread(
                    status.update, f"🔍 No face… ({len(collected)}/{samples})")
                time.sleep(0.05)
            cv2.putText(display, f"Samples: {len(collected)}/{samples}",
                        (10, display.shape[0]-12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2)
            cv2.imshow(win, display)
            cv2.waitKey(1)

        cap.release()
        cv2.destroyWindow(win)

        if len(collected) < max(1, samples // 2):
            self.app.call_from_thread(
                status.update, "❌ Too few samples — check lighting and face the camera.")
            self.app.call_from_thread(
                self.query_one("#btn-capture", Button).__setattr__, "disabled", False)
            return

        self.app.call_from_thread(
            status.update, f"🎉 Registered '{name}' [{pid}]  ({len(collected)} samples)!")
        time.sleep(0.9)
        self.app.call_from_thread(self.dismiss, self.Registered(pid, name, collected, user_id))
