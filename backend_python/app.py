"""
Face Detection App — Textual TUI + InsightFace + OpenCV
========================================================
Run:
    python app.py

Face DB schema (per record):
    {
        "<person_id>": {
            "person_id":  str,
            "name":       str,
            "embeddings": list[np.ndarray],
            "created_at": str,   # ISO timestamp
        }, ...
    }
"""

import threading
import time
import uuid
from datetime import datetime, timezone

import cv2

from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, ScrollableContainer, Vertical
from textual.reactive import reactive
from textual.widgets import Button, Footer, Header, Label, Log
from textual import on

from ch_logger import DetectionEntry, now_ts
from config import (
    PREVIEW_WINDOW,
    YAML_AVAILABLE,
    camera_index,
    cosine_threshold,
    detect_interval,
    model_name,
    model_provider,
    model_root,
)
from face_engine import (
    INSIGHTFACE_AVAILABLE,
    best_match,
    draw_face_box,
    get_face_app,
    load_faces_db,
    make_record,
    save_faces_db,
)
from backend_client import GRPC_AVAILABLE, get_backend_client
from screens.class_select import ClassSelectScreen
from screens.detection_log import DetectionLogScreen
from screens.face_manager import FaceManagerScreen
from screens.register import RegisterScreen
from screens.settings import SettingsScreen


class FaceDetectionApp(App):

    TITLE     = "InsightFace Detection System"
    SUB_TITLE = "buffalo_l · OpenCV · Textual"

    CSS = """
    Screen { background: #0d1117; }
    Header { background: #161b22; color: #58a6ff; }
    Footer { background: #161b22; color: #8b949e; }

    #root-layout { height: 1fr; padding: 1 2; }

    #sidebar {
        width: 38; height: 1fr;
        border: round #30363d; background: #161b22; padding: 1 2;
    }
    #panel-title {
        text-style: bold; color: #58a6ff; text-align: center;
        border-bottom: solid #30363d; padding-bottom: 1; margin-bottom: 1;
    }
    #status-box {
        height: 8; border: round #30363d; background: #0d1117;
        padding: 1; margin-bottom: 1;
    }
    #detection-status { text-align: center; text-style: bold; color: #8b949e; }
    #registered-count { text-align: center; color: #e3b341; }
    #fps-label        { text-align: center; color: #3fb950; }
    #model-info       { text-align: center; color: #484f58; }

    .sidebar-btn { width: 100%; margin-bottom: 1; }

    #list-title {
        color: #8b949e; text-style: italic;
        margin-top: 1; padding-top: 1; border-top: solid #30363d;
    }
    #people-scroll {
        height: 1fr; border: round #21262d;
        background: #0d1117; padding: 0 1;
    }
    .person-entry { color: #c9d1d9; }

    #log-panel {
        width: 1fr; height: 1fr;
        border: round #30363d; background: #0d1117;
        margin-left: 2; padding: 1;
    }
    #log-title {
        text-style: bold; color: #58a6ff;
        border-bottom: solid #30363d; padding-bottom: 1; margin-bottom: 1;
    }
    #event-log {
        height: 1fr; background: #0d1117;
        color: #c9d1d9; scrollbar-color: #30363d;
    }
    """

    is_detecting: reactive[bool] = reactive(False)
    face_db:      reactive[dict] = reactive({}, always_update=True)

    # ── Lifecycle ────────────────────────────────────────────────────

    def on_mount(self):
        self.face_db       = load_faces_db()
        self._stop_event   = threading.Event()
        self._log_lock     = threading.Lock()
        self._session_log:        list[DetectionEntry] = []
        self._session_id:         str                  = ""
        self._session_class_id:   int                  = 0
        self._session_class_name: str                  = ""

        self._refresh_summary()
        self._update_model_info()
        self._log(f"ℹ  App ready.  Model: {model_name()}  |  Provider: {model_provider()}")
        if not YAML_AVAILABLE:
            self._log("⚠  pyyaml missing — settings won't persist.  pip install pyyaml")
        if not INSIGHTFACE_AVAILABLE:
            self._log("❌  InsightFace missing.  pip install insightface onnxruntime")

    def on_unmount(self):
        self._stop_event.set()
        cv2.destroyAllWindows()

    # ── Layout ───────────────────────────────────────────────────────

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="root-layout"):
            with Vertical(id="sidebar"):
                yield Label("⚙  Controls", id="panel-title")
                with Container(id="status-box"):
                    yield Label("● IDLE",               id="detection-status")
                    yield Label("Registered: 0 people", id="registered-count")
                    yield Label("",                     id="fps-label")
                    yield Label("",                     id="model-info")
                yield Button("📋  Register Face",   variant="primary", id="btn-register",  classes="sidebar-btn")
                yield Button("👥  Face Manager",    variant="default", id="btn-manager",   classes="sidebar-btn")
                yield Button("🔍  Start Detection", variant="success", id="btn-detect",    classes="sidebar-btn")
                yield Button("⏹  Stop Detection",  variant="error",   id="btn-stop",      classes="sidebar-btn")
                yield Button("📊  Detection Log",   variant="default", id="btn-det-log",   classes="sidebar-btn")
                yield Button("🛠  Settings",        variant="default", id="btn-settings",  classes="sidebar-btn")
                yield Label("  Registered People", id="list-title")
                with ScrollableContainer(id="people-scroll"):
                    yield Label("(none)", classes="person-entry")
            with Vertical(id="log-panel"):
                yield Label("📜  Event Log", id="log-title")
                yield Log(id="event-log", highlight=True)
        yield Footer()

    # ── Button handlers ──────────────────────────────────────────────

    @on(Button.Pressed, "#btn-register")
    def on_register(self):
        if not INSIGHTFACE_AVAILABLE:
            self._log("❌ InsightFace not installed."); return

        def handle(result):
            if not isinstance(result, RegisterScreen.Registered): return
            db = load_faces_db()
            if result.pid in db:
                db[result.pid]["embeddings"].extend(result.embeddings)
                if result.user_id:
                    db[result.pid]["user_id"] = result.user_id
                self._log(f"🔄 Updated [{result.pid}] {result.name} (+{len(result.embeddings)} samples)")
            else:
                db[result.pid] = make_record(result.pid, result.name,
                                             result.embeddings, result.user_id)
                self._log(f"✅ Registered [{result.pid}] {result.name} ({len(result.embeddings)} samples)")
            save_faces_db(db)
            self.face_db = db
            self._refresh_summary()
        self.push_screen(RegisterScreen(), handle)

    @on(Button.Pressed, "#btn-manager")
    def on_manager(self):
        def handle(_):
            self.face_db = load_faces_db()
            self._refresh_summary()
        self.push_screen(FaceManagerScreen(), handle)

    def on_face_manager_screen_db_changed(self, _):
        self.face_db = load_faces_db()
        self._refresh_summary()

    @on(Button.Pressed, "#btn-detect")
    def on_start_detect(self):
        if self.is_detecting: return
        if not INSIGHTFACE_AVAILABLE:
            self._log("❌ InsightFace not installed."); return
        if not self.face_db:
            self._log("⚠ Register at least one face first."); return

        def handle(result: dict | None):
            if not result:
                return  # user cancelled
            self._session_class_id   = result["class_id"]
            self._session_class_name = result["class_name"]
            with self._log_lock:
                self._session_log = []
                self._session_id  = str(uuid.uuid4())
            self.is_detecting = True
            self._set_ui(detecting=True)
            self._stop_event.clear()
            threading.Thread(target=self._detection_loop, daemon=True).start()
            self._log(f"🔍 Detection started  —  Class: {self._session_class_name}")

        self.push_screen(ClassSelectScreen(), handle)

    @on(Button.Pressed, "#btn-stop")
    def on_stop_detect(self):
        if not self.is_detecting: return
        self._stop_event.set()
        self.is_detecting = False
        self._set_ui(detecting=False)
        self._log("⏹ Detection stopped.")

    @on(Button.Pressed, "#btn-det-log")
    def on_det_log(self):
        with self._log_lock:
            snapshot = list(self._session_log)
        self.push_screen(DetectionLogScreen(snapshot, self._session_class_name))

    @on(Button.Pressed, "#btn-settings")
    def on_settings(self):
        if self.is_detecting:
            self._log("⚠ Stop detection before changing settings."); return

        def handle(saved: bool):
            if saved:
                self._update_model_info()
                self._log(f"✅ Settings saved — model: {model_name()}  "
                          f"root: '{model_provider()}'  threshold: {cosine_threshold()}")
        self.push_screen(SettingsScreen(), handle)

    # ── UI helpers ───────────────────────────────────────────────────

    def _set_ui(self, detecting: bool):
        s = self.query_one("#detection-status", Label)
        s.update("● DETECTING" if detecting else "● IDLE")
        s.styles.color = "#3fb950" if detecting else "#8b949e"
        if not detecting:
            self.query_one("#fps-label", Label).update("")
        for bid in ("#btn-detect", "#btn-register", "#btn-manager", "#btn-settings"):
            self.query_one(bid, Button).disabled = detecting
        self.query_one("#btn-det-log", Button).disabled = False
        self.query_one("#btn-stop",    Button).display  = detecting

    def _update_model_info(self):
        root = model_root() or "~/.insightface"
        self.query_one("#model-info", Label).update(f"{model_name()}  @  {root}")
        self.sub_title = f"model: {model_name()}  ·  provider: {model_provider()}"

    def _refresh_summary(self):
        scroll = self.query_one("#people-scroll", ScrollableContainer)
        for child in list(scroll.children):
            child.remove()
        count = len(self.face_db)
        self.query_one("#registered-count", Label).update(
            f"Registered: {count} {'person' if count == 1 else 'people'}")
        if count == 0:
            scroll.mount(Label("(none)", classes="person-entry"))
        else:
            for pid in sorted(self.face_db.keys()):
                rec = self.face_db[pid]
                n   = len(rec.get("embeddings", []))
                scroll.mount(Label(f"  [{pid}]  {rec.get('name', '—')}  ({n} samples)",
                                   classes="person-entry"))

    def _log(self, msg: str):
        ts = datetime.now().strftime("%H:%M:%S")
        self.query_one("#event-log", Log).write_line(f"[{ts}]  {msg}")

    # ── ClickHouse helpers ───────────────────────────────────────────

    # ── Attendance push log ──────────────────────────────────────────

    def _push_log(self, pid: str, name: str, user_id: int, seen_at: str):
        """Called in a daemon thread. Pushes raw detection event to the Go backend."""
        from google.protobuf.timestamp_pb2 import Timestamp  # local import; grpc dep
        ts = Timestamp()
        try:
            dt = datetime.strptime(seen_at, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            ts.FromDatetime(dt)
        except Exception:
            pass  # leave ts as zero; backend will use server time
        try:
            get_backend_client().push_log(
                session_id   = self._session_id,
                user_id      = user_id,
                student_id   = pid,
                student_name = name,
                class_id     = self._session_class_id,
                class_name   = self._session_class_name,
                seen_at_ts   = ts,
            )
            self.call_from_thread(self._log, f"📋 Pushed log: {name}  [{pid}]")
        except Exception as e:
            self.call_from_thread(
                self._log, f"⚠  Push log failed for [{pid}]: {e}")

    # ── Detection loop ───────────────────────────────────────────────

    def _detection_loop(self):
        self.call_from_thread(self._log, "⏳ Loading InsightFace model…")
        try:
            fa = get_face_app()
        except Exception as e:
            self.call_from_thread(self._log, f"❌ Model failed: {e}")
            self.call_from_thread(self._set_ui, False)
            self.is_detecting = False
            return

        self.call_from_thread(self._log, "✅ Model ready.")
        cap = cv2.VideoCapture(camera_index())
        if not cap.isOpened():
            self.call_from_thread(self._log, "❌ Cannot open camera.")
            self.call_from_thread(self._set_ui, False)
            self.is_detecting = False
            return

        cv2.namedWindow(PREVIEW_WINDOW, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(PREVIEW_WINDOW, 800, 600)

        last_ids:    set[str]    = set()
        frame_times: list[float] = []

        while not self._stop_event.is_set():
            t0 = time.perf_counter()
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05); continue

            faces       = fa.get(frame)
            current_ids = set()
            display     = frame.copy()

            for face in faces:
                if face.embedding is None: continue
                pid, dname, dist = best_match(face.embedding, self.face_db)
                current_ids.add(pid)
                draw_face_box(display, face.bbox, dname, dist)

            elapsed = time.perf_counter() - t0
            frame_times.append(elapsed)
            if len(frame_times) > 30: frame_times.pop(0)
            fps = 1.0 / (sum(frame_times) / len(frame_times))

            cv2.putText(display, f"FPS: {fps:.1f}  |  Faces: {len(faces)}",
                        (10, display.shape[0]-12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 2, cv2.LINE_AA)
            cv2.imshow(PREVIEW_WINDOW, display)
            if (cv2.waitKey(1) & 0xFF) == ord('q'):
                self._stop_event.set(); break

            # Update session log for appeared / disappeared faces
            ts          = now_ts()
            appeared    = current_ids - last_ids
            disappeared = last_ids - current_ids

            for pid in appeared:
                record = self.face_db.get(pid, {})
                name   = record.get("name", "Unknown") if pid != "unknown" else "Unknown"
                entry  = DetectionEntry(
                    class_id     = self._session_class_id,
                    student_id   = pid,
                    class_name   = self._session_class_name,
                    student_name = name,
                    seen_at      = ts,
                )
                with self._log_lock:
                    self._session_log.append(entry)
                msg = ("👤 Unknown face detected" if pid == "unknown"
                       else f"🟢 Recognized: {name}  [{pid}]")
                self.call_from_thread(self._log, msg)
                # Push every appearance event to the backend; backend handles dedup.
                if pid != "unknown" and GRPC_AVAILABLE:
                    uid_str = record.get("user_id", "")
                    threading.Thread(
                        target=self._push_log,
                        args=(pid, name, int(uid_str) if uid_str else 0, ts),
                        daemon=True,
                    ).start()

            for pid in disappeared:
                name = self.face_db.get(pid, {}).get("name", pid)
                msg = ("👋 Unknown face left the frame." if pid == "unknown"
                       else f"👋 {name} [{pid}] left the frame.")
                self.call_from_thread(self._log, msg)

            last_ids = current_ids
            self.call_from_thread(
                self.query_one("#fps-label", Label).update,
                f"FPS: {fps:.1f}  |  Faces: {len(faces)}")
            time.sleep(max(0.0, detect_interval() - elapsed))

        cap.release()
        cv2.destroyWindow(PREVIEW_WINDOW)
        if self.is_detecting:
            self.is_detecting = False
            self.call_from_thread(self._set_ui, False)
            self.call_from_thread(self._log, "⏹ Detection stopped (window closed).")
        else:
            self.call_from_thread(self._log, "📷 Camera released.")


# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    FaceDetectionApp().run()
