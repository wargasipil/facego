"""
Face Detection App — Textual TUI + InsightFace + OpenCV Preview Window
=======================================================================
Install:
    pip install textual opencv-python insightface onnxruntime numpy pyyaml

Run:
    python face_detection_app.py

Face DB schema (per record):
    {
        "<person_id>": {
            "person_id":  str,   # unique alphanumeric ID, e.g. "EMP001"
            "name":       str,   # display name, e.g. "Alice Smith"
            "embeddings": list[np.ndarray],
            "created_at": str,   # ISO timestamp
        },
        ...
    }
"""

import re
import csv
import cv2
import pickle
import os
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import numpy as np
# from insightface.app import FaceAnalysis

# ── Optional deps ──────────────────────────────────────────────────────────────
try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False

from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal, Vertical, ScrollableContainer
from textual.widgets import (
    Button, Footer, Header, Label, Log,
    Input, ProgressBar, Select, DataTable,
)
from textual.screen import ModalScreen
from textual import on, work
from textual.reactive import reactive
from textual.message import Message


# ══════════════════════════════════════════════════════════════════════════════
# Config
# ══════════════════════════════════════════════════════════════════════════════
CONFIG_PATH = Path(__file__).parent / "config.yaml"

DEFAULT_CONFIG: dict = {
    "model":       {"name": "buffalo_l", "root": "", "det_size": [640, 640],
                    "provider": "CPUExecutionProvider"},
    "recognition": {"cosine_threshold": 0.40, "capture_samples": 8},
    "camera":      {"device_index": 0, "detection_interval": 0.03},
    "storage":     {"faces_db": "registered_faces.pkl"},
}


def _deep_merge(base: dict, override: dict) -> dict:
    result = base.copy()
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def load_config() -> dict:
    if YAML_AVAILABLE and CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            user = yaml.safe_load(f) or {}
        return _deep_merge(DEFAULT_CONFIG, user)
    return DEFAULT_CONFIG.copy()


def save_config(cfg: dict):
    if YAML_AVAILABLE:
        with open(CONFIG_PATH, "w") as f:
            yaml.dump(cfg, f, default_flow_style=False, sort_keys=False)


CFG = load_config()

def model_name()       -> str:   return CFG["model"]["name"]
def model_root()       -> str:   return CFG["model"]["root"]
def model_det_size()   -> tuple: return tuple(CFG["model"]["det_size"])
def model_provider()   -> str:   return CFG["model"]["provider"]
def cosine_threshold() -> float: return float(CFG["recognition"]["cosine_threshold"])
def capture_samples()  -> int:   return int(CFG["recognition"]["capture_samples"])
def camera_index()     -> int:   return int(CFG["camera"]["device_index"])
def detect_interval()  -> float: return float(CFG["camera"]["detection_interval"])
def faces_db_path()    -> str:   return CFG["storage"]["faces_db"]

PREVIEW_WINDOW = "InsightFace — Camera Preview"


# ══════════════════════════════════════════════════════════════════════════════
# Detection Session Log
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class DetectionEntry:
    """One row in the detection log: tracks a person across a detection session."""
    person_id:       str
    name:            str
    first_seen_at:   str   # "YYYY-MM-DD HH:MM:SS"
    last_seen_at:    str   # updated every time the person re-enters the frame
    detection_count: int = 1   # total number of separate appearances


def now_ts() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ══════════════════════════════════════════════════════════════════════════════
# DB schema helpers
# ══════════════════════════════════════════════════════════════════════════════

def make_record(person_id: str, name: str, embeddings: list) -> dict:
    return {
        "person_id":  person_id,
        "name":       name,
        "embeddings": embeddings,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }


def load_faces_db() -> dict:
    path = faces_db_path()
    if os.path.exists(path):
        with open(path, "rb") as f:
            return pickle.load(f)
    return {}


def save_faces_db(db: dict):
    with open(faces_db_path(), "wb") as f:
        pickle.dump(db, f)


# ══════════════════════════════════════════════════════════════════════════════
# Validation helpers
# ══════════════════════════════════════════════════════════════════════════════
ID_PATTERN = re.compile(r"^[A-Za-z0-9_\-]{1,32}$")


def validate_person_id(pid: str, db: dict, exclude_pid: str = "") -> str | None:
    """Return an error string or None if valid."""
    pid = pid.strip()
    if not pid:
        return "Person ID cannot be empty."
    if not ID_PATTERN.match(pid):
        return "Person ID: only letters, digits, _ and - allowed (max 32 chars)."
    if pid in db and pid != exclude_pid:
        return f"Person ID '{pid}' is already registered."
    return None


def validate_name(name: str) -> str | None:
    name = name.strip()
    if not name:
        return "Name cannot be empty."
    if len(name) > 64:
        return "Name is too long (max 64 characters)."
    if name.strip("") == "":
        return "Name cannot be blank spaces only."
    return None


# ══════════════════════════════════════════════════════════════════════════════
# Face matching / drawing helpers
# ══════════════════════════════════════════════════════════════════════════════
def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    a = a / (np.linalg.norm(a) + 1e-6)
    b = b / (np.linalg.norm(b) + 1e-6)
    return float(1.0 - np.dot(a, b))


def best_match(embedding: np.ndarray, db: dict) -> tuple[str, str, float]:
    """Return (person_id, display_name, distance) of closest match, or Unknown."""
    best_pid, best_name, best_dist = "unknown", "Unknown", cosine_threshold()
    for pid, record in db.items():
        for known_emb in record["embeddings"]:
            dist = cosine_distance(embedding, known_emb)
            if dist < best_dist:
                best_dist = dist
                best_pid  = pid
                best_name = record["name"]
    return best_pid, best_name, best_dist


def draw_face_box(frame: np.ndarray, bbox, display_name: str, dist: float = 0.0):
    x1, y1, x2, y2 = [int(v) for v in bbox]
    known     = display_name != "Unknown"
    box_color = (0, 220, 80) if known else (0, 80, 220)
    label_bg  = (0, 180, 60) if known else (0, 60, 180)
    label     = f"{display_name}  {(1-dist)*100:.0f}%" if known else "Unknown"
    cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
    (tw, th), bl = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
    label_y = max(y1 - 8, th + 4)
    cv2.rectangle(frame, (x1, label_y-th-4), (x1+tw+6, label_y+bl), label_bg, -1)
    cv2.putText(frame, label, (x1+3, label_y-2),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)


# ══════════════════════════════════════════════════════════════════════════════
# Shared InsightFace model
# ══════════════════════════════════════════════════════════════════════════════
_face_app   = None
_model_lock = threading.Lock()


def get_face_app():
    global _face_app
    with _model_lock:
        if _face_app is None:
            kwargs = dict(name=model_name(), providers=[model_provider()])
            if model_root():
                kwargs["root"] = model_root()
            fa = FaceAnalysis(**kwargs)
            fa.prepare(ctx_id=0, det_size=model_det_size())
            _face_app = fa
    return _face_app


def reset_face_app():
    global _face_app
    with _model_lock:
        _face_app = None


# ══════════════════════════════════════════════════════════════════════════════
# Shared modal CSS helpers
# ══════════════════════════════════════════════════════════════════════════════
_FIELD_ROW_CSS = """
    .field-row   { height: 3; margin-bottom: 0; }
    .field-label { color: #8b949e; width: 18; content-align: left middle; }
    .field-error { color: #f85149; height: 1; margin-left: 19; }
    Input        { width: 1fr; }
"""


# ══════════════════════════════════════════════════════════════════════════════
# Modal: Confirm Delete
# ══════════════════════════════════════════════════════════════════════════════
class ConfirmDeleteScreen(ModalScreen):

    CSS = """
    ConfirmDeleteScreen { align: center middle; }
    #confirm-box {
        width: 54; height: auto;
        border: thick $error;
        background: #161b22;
        padding: 2 4;
    }
    #confirm-title { text-style: bold; color: #f85149; text-align: center; margin-bottom: 1; }
    #confirm-msg   { text-align: center; color: #c9d1d9; margin-bottom: 1; height: auto; }
    #confirm-btns  { height: auto; margin-top: 1; }
    #confirm-btns Button { margin: 0 1; width: 1fr; }
    """

    def __init__(self, message: str):
        super().__init__()
        self._message = message

    def compose(self) -> ComposeResult:
        with Container(id="confirm-box"):
            yield Label("⚠  Confirm Delete", id="confirm-title")
            yield Label(self._message, id="confirm-msg")
            with Horizontal(id="confirm-btns"):
                yield Button("Yes, Delete", variant="error",   id="btn-confirm-yes")
                yield Button("Cancel",      variant="default", id="btn-confirm-no")

    @on(Button.Pressed, "#btn-confirm-yes")
    def confirm(self): self.dismiss(True)

    @on(Button.Pressed, "#btn-confirm-no")
    def cancel(self):  self.dismiss(False)


# ══════════════════════════════════════════════════════════════════════════════
# Modal: View face details  (Read)
# ══════════════════════════════════════════════════════════════════════════════
class ViewFaceScreen(ModalScreen):

    CSS = """
    ViewFaceScreen { align: center middle; }
    #view-box {
        width: 62; height: auto;
        border: thick $accent;
        background: #161b22;
        padding: 2 4;
    }
    #view-title   { text-style: bold; color: #58a6ff; text-align: center; margin-bottom: 1; }
    .detail-row   { height: 2; }
    .detail-key   { color: #8b949e; width: 22; content-align: left middle; }
    .detail-val   { color: #c9d1d9; width: 1fr; content-align: left middle; }
    .detail-id    { color: #e3b341; width: 1fr; content-align: left middle; }
    #close-btn    { width: 100%; margin-top: 1; }
    """

    def __init__(self, pid: str, db: dict):
        super().__init__()
        self._pid = pid
        self._db  = db

    def compose(self) -> ComposeResult:
        record   = self._db.get(self._pid, {})
        name     = record.get("name", "—")
        pid      = record.get("person_id", self._pid)
        embs     = record.get("embeddings", [])
        created  = record.get("created_at", "—")
        dim      = embs[0].shape[0] if embs else "—"
        avg_norm = float(np.mean([np.linalg.norm(e) for e in embs])) if embs else 0.0

        with Container(id="view-box"):
            yield Label(f"👤  {name}", id="view-title")
            with Horizontal(classes="detail-row"):
                yield Label("Person ID",         classes="detail-key")
                yield Label(pid,                 classes="detail-id")
            with Horizontal(classes="detail-row"):
                yield Label("Name",              classes="detail-key")
                yield Label(name,                classes="detail-val")
            with Horizontal(classes="detail-row"):
                yield Label("Samples stored",    classes="detail-key")
                yield Label(str(len(embs)),      classes="detail-val")
            with Horizontal(classes="detail-row"):
                yield Label("Embedding dim",     classes="detail-key")
                yield Label(str(dim),            classes="detail-val")
            with Horizontal(classes="detail-row"):
                yield Label("Avg ‖embedding‖",   classes="detail-key")
                yield Label(f"{avg_norm:.4f}",   classes="detail-val")
            with Horizontal(classes="detail-row"):
                yield Label("Created at",        classes="detail-key")
                yield Label(created,             classes="detail-val")
            with Horizontal(classes="detail-row"):
                yield Label("DB file",           classes="detail-key")
                yield Label(faces_db_path(),     classes="detail-val")
            yield Button("Close", variant="primary", id="close-btn")

    @on(Button.Pressed, "#close-btn")
    def close(self): self.dismiss(None)


# ══════════════════════════════════════════════════════════════════════════════
# Modal: Edit face record  (Update — person_id + name)
# ══════════════════════════════════════════════════════════════════════════════
class EditFaceScreen(ModalScreen):

    CSS = """
    EditFaceScreen { align: center middle; }
    #edit-box {
        width: 66; height: auto;
        border: thick $accent;
        background: #161b22;
        padding: 2 4;
    }
    #edit-title  { text-style: bold; color: #58a6ff; text-align: center; margin-bottom: 1; }
    .field-row   { height: 3; margin-bottom: 0; }
    .field-label { color: #8b949e; width: 18; content-align: left middle; }
    .field-error { color: #f85149; height: 1; margin-left: 19; margin-bottom: 0; }
    Input        { width: 1fr; }
    #btn-row     { margin-top: 1; height: auto; }
    Button       { margin: 0 1; }
    """

    class Updated(Message):
        def __init__(self, old_pid: str, new_pid: str, new_name: str):
            super().__init__()
            self.old_pid  = old_pid
            self.new_pid  = new_pid
            self.new_name = new_name

    def __init__(self, pid: str, db: dict):
        super().__init__()
        self._pid = pid
        self._db  = db

    def compose(self) -> ComposeResult:
        record = self._db.get(self._pid, {})
        with Container(id="edit-box"):
            yield Label(f"✏  Edit  —  {record.get('name', self._pid)}", id="edit-title")

            with Horizontal(classes="field-row"):
                yield Label("Person ID *", classes="field-label")
                yield Input(value=record.get("person_id", self._pid),
                            id="inp-pid", placeholder="e.g. EMP001")
            yield Label("", id="err-pid", classes="field-error")

            with Horizontal(classes="field-row"):
                yield Label("Name *",      classes="field-label")
                yield Input(value=record.get("name", ""),
                            id="inp-name", placeholder="e.g. Alice Smith")
            yield Label("", id="err-name", classes="field-error")

            with Horizontal(id="btn-row"):
                yield Button("Save",   variant="primary", id="btn-save")
                yield Button("Cancel", variant="error",   id="btn-cancel")

    @on(Button.Pressed, "#btn-cancel")
    def cancel(self): self.dismiss(None)

    @on(Button.Pressed, "#btn-save")
    def save(self):
        new_pid  = self.query_one("#inp-pid",  Input).value.strip()
        new_name = self.query_one("#inp-name", Input).value.strip()

        err_pid  = validate_person_id(new_pid, self._db, exclude_pid=self._pid)
        err_name = validate_name(new_name)

        self.query_one("#err-pid",  Label).update(f"  ⚠ {err_pid}"  if err_pid  else "")
        self.query_one("#err-name", Label).update(f"  ⚠ {err_name}" if err_name else "")

        if err_pid or err_name:
            return

        self.dismiss(self.Updated(self._pid, new_pid, new_name))


# ══════════════════════════════════════════════════════════════════════════════
# Modal: Add more samples  (Update — embeddings only)
# ══════════════════════════════════════════════════════════════════════════════
class AddSamplesScreen(ModalScreen):

    CSS = """
    AddSamplesScreen { align: center middle; }
    #add-box {
        width: 64; height: auto;
        border: thick $accent;
        background: #161b22;
        padding: 2 4;
    }
    #add-title    { text-style: bold; color: #58a6ff; text-align: center; margin-bottom: 1; }
    #status-label { text-align: center; color: #8b949e; margin: 1 0; height: 2; }
    #btn-row      { margin-top: 1; height: auto; }
    Button        { margin: 0 1; }
    """

    class SamplesAdded(Message):
        def __init__(self, pid: str, embeddings: list):
            super().__init__()
            self.pid        = pid
            self.embeddings = embeddings

    def __init__(self, pid: str, name: str):
        super().__init__()
        self._pid  = pid
        self._name = name

    def compose(self) -> ComposeResult:
        with Container(id="add-box"):
            yield Label(f"📸  Add Samples  —  {self._name} [{self._pid}]", id="add-title")
            yield Label("", id="status-label")
            yield ProgressBar(total=capture_samples(), id="progress", show_eta=False)
            with Horizontal(id="btn-row"):
                yield Button("Start Capture", variant="primary", id="btn-start")
                yield Button("Cancel",        variant="error",   id="btn-cancel")

    @on(Button.Pressed, "#btn-cancel")
    def cancel(self): self.dismiss(None)

    @on(Button.Pressed, "#btn-start")
    def start(self):
        self.query_one("#btn-start", Button).disabled = True
        self._run_capture()

    @work(thread=True)
    def _run_capture(self):
        status   = self.query_one("#status-label", Label)
        progress = self.query_one("#progress", ProgressBar)
        samples  = capture_samples()

        self.app.call_from_thread(status.update, "⏳ Loading model…")
        try:
            fa = get_face_app()
        except Exception as e:
            self.app.call_from_thread(status.update, f"❌ Model error: {e}")
            return

        self.app.call_from_thread(status.update, "📷 Opening camera…")
        cap = cv2.VideoCapture(camera_index())
        if not cap.isOpened():
            self.app.call_from_thread(status.update, "❌ Cannot open camera.")
            self.app.call_from_thread(
                self.query_one("#btn-start", Button).__setattr__, "disabled", False)
            return

        collected, attempts = [], 0
        win = f"Add Samples — {self._name}"
        cv2.namedWindow(win, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(win, 640, 480)

        while len(collected) < samples and attempts < samples * 8:
            ret, frame = cap.read()
            attempts += 1
            if not ret: continue
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
                cv2.putText(display, "No face — move closer",
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

        if not collected:
            self.app.call_from_thread(status.update, "❌ No samples captured.")
            self.app.call_from_thread(
                self.query_one("#btn-start", Button).__setattr__, "disabled", False)
            return

        self.app.call_from_thread(
            status.update, f"🎉 Captured {len(collected)} new samples!")
        time.sleep(0.9)
        self.app.call_from_thread(self.dismiss, self.SamplesAdded(self._pid, collected))


# ══════════════════════════════════════════════════════════════════════════════
# Modal: Register Face  (Create)
# ══════════════════════════════════════════════════════════════════════════════
class RegisterScreen(ModalScreen):

    CSS = """
    RegisterScreen { align: center middle; }
    #register-box {
        width: 68; height: auto;
        border: thick $accent;
        background: #161b22;
        padding: 2 4;
    }
    #register-title { text-style: bold; color: #58a6ff; text-align: center; margin-bottom: 1; }
    .field-row      { height: 3; margin-bottom: 0; }
    .field-label    { color: #8b949e; width: 18; content-align: left middle; }
    .field-hint     { color: #484f58; height: 1; margin-left: 19; }
    .field-error    { color: #f85149; height: 1; margin-left: 19; }
    Input           { width: 1fr; }
    #status-label   { text-align: center; color: #8b949e; margin: 1 0; height: 2; }
    #btn-row        { margin-top: 1; height: auto; }
    Button          { margin: 0 1; }
    """

    class Registered(Message):
        def __init__(self, pid: str, name: str, embeddings: list):
            super().__init__()
            self.pid        = pid
            self.name       = name
            self.embeddings = embeddings

    def compose(self) -> ComposeResult:
        with Container(id="register-box"):
            yield Label("📷  Register New Face", id="register-title")

            with Horizontal(classes="field-row"):
                yield Label("Person ID *",  classes="field-label")
                yield Input(placeholder="e.g. EMP001  (letters, digits, _ -)", id="inp-pid")
            yield Label("Unique ID — letters, digits, underscore, hyphen. Max 32 chars.",
                        id="hint-pid", classes="field-hint")
            yield Label("", id="err-pid", classes="field-error")

            with Horizontal(classes="field-row"):
                yield Label("Name *",       classes="field-label")
                yield Input(placeholder="e.g. Alice Smith", id="inp-name")
            yield Label("Display name shown in detection overlay. Max 64 chars.",
                        id="hint-name", classes="field-hint")
            yield Label("", id="err-name", classes="field-error")

            yield Label("", id="status-label")
            yield ProgressBar(total=capture_samples(), id="progress", show_eta=False)

            with Horizontal(id="btn-row"):
                yield Button("Capture", variant="primary", id="btn-capture")
                yield Button("Cancel",  variant="error",   id="btn-cancel")

    @on(Button.Pressed, "#btn-cancel")
    def cancel(self): self.dismiss(None)

    @on(Button.Pressed, "#btn-capture")
    def start_capture(self):
        pid  = self.query_one("#inp-pid",  Input).value.strip()
        name = self.query_one("#inp-name", Input).value.strip()
        db   = load_faces_db()

        err_pid  = validate_person_id(pid, db)
        err_name = validate_name(name)

        self.query_one("#err-pid",  Label).update(f"  ⚠ {err_pid}"  if err_pid  else "")
        self.query_one("#err-name", Label).update(f"  ⚠ {err_name}" if err_name else "")

        if err_pid or err_name:
            return

        self.query_one("#btn-capture", Button).disabled = True
        self.query_one("#inp-pid",     Input).disabled  = True
        self.query_one("#inp-name",    Input).disabled  = True
        self._run_capture(pid, name)

    @work(thread=True)
    def _run_capture(self, pid: str, name: str):
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
            if not ret: continue
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
        self.app.call_from_thread(self.dismiss, self.Registered(pid, name, collected))


# ══════════════════════════════════════════════════════════════════════════════
# Modal: Face Manager  (full CRUD DataTable)
# ══════════════════════════════════════════════════════════════════════════════
class FaceManagerScreen(ModalScreen):

    CSS = """
    FaceManagerScreen { align: center middle; }

    #manager-box {
        width: 100; height: 44;
        border: thick $accent;
        background: #0d1117;
        padding: 1 2;
    }
    #manager-title {
        text-style: bold; color: #58a6ff; text-align: center;
        border-bottom: solid #30363d;
        padding-bottom: 1; margin-bottom: 1;
    }
    #table-area {
        height: 1fr;
        border: round #30363d;
        background: #0d1117;
        margin-bottom: 1;
    }
    DataTable { height: 1fr; background: #0d1117; }

    #btn-row-top, #btn-row-bot {
        height: 3;
        margin-bottom: 1;
    }
    #btn-row-top Button, #btn-row-bot Button {
        margin: 0 1;
        width: 1fr;
    }
    #status-bar {
        height: 2;
        color: #8b949e;
        text-align: center;
        border-top: solid #30363d;
        padding-top: 1;
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
            record  = db[pid]
            name    = record.get("name", "—")
            embs    = record.get("embeddings", [])
            created = record.get("created_at", "—")
            table.add_row(pid, name, str(len(embs)), created, key=pid)
        self.query_one("#status-bar", Label).update(
            f"{len(db)} face(s) registered.  Select a row and choose an action.")

    def _selected_pid(self) -> str | None:
        table = self.query_one("#face-table", DataTable)
        if table.cursor_row < 0:
            return None
        row = table.get_row_at(table.cursor_row)
        return str(row[0])   # Person ID is column 0

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
            else:
                db[result.pid] = make_record(result.pid, result.name, result.embeddings)
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

    # ── Update: Edit (person_id + name) ─────────────────────────────
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
            self._status(
                f"✅ Updated  [{result.old_pid}→{result.new_pid}]  {result.new_name}.")
            self.post_message(self.DBChanged())

        self.app.push_screen(EditFaceScreen(pid, db), handle)

    # ── Update: Add Samples ──────────────────────────────────────────
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
            self._status(
                f"✅ Added {len(result.embeddings)} samples to [{result.pid}].")
            self.post_message(self.DBChanged())

        self.app.push_screen(AddSamplesScreen(pid, name), handle)

    # ── Delete: single ───────────────────────────────────────────────
    @on(Button.Pressed, "#btn-delete")
    def on_delete(self):
        pid = self._selected_pid()
        if not pid:
            self._status("⚠ Select a row first."); return
        db   = load_faces_db()
        name = db[pid].get("name", pid)

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

    # ── Close ────────────────────────────────────────────────────────
    @on(Button.Pressed, "#btn-close")
    def on_close(self): self.dismiss(None)


# ══════════════════════════════════════════════════════════════════════════════
# Modal: Detection Log  (view + export CSV)
# ══════════════════════════════════════════════════════════════════════════════
class DetectionLogScreen(ModalScreen):
    """Shows the current session's detection log and allows CSV export."""

    CSS = """
    DetectionLogScreen { align: center middle; }

    #log-box {
        width: 100; height: 40;
        border: thick $accent;
        background: #0d1117;
        padding: 1 2;
    }
    #log-screen-title {
        text-style: bold; color: #58a6ff; text-align: center;
        border-bottom: solid #30363d;
        padding-bottom: 1; margin-bottom: 1;
    }
    #log-table-area {
        height: 1fr;
        border: round #30363d;
        background: #0d1117;
        margin-bottom: 1;
    }
    DataTable { height: 1fr; background: #0d1117; }
    #log-summary {
        height: 2; color: #8b949e; text-align: center;
        border-top: solid #30363d; padding-top: 1;
    }
    #log-btn-row { height: 3; margin-bottom: 1; }
    #log-btn-row Button { margin: 0 1; width: 1fr; }
    #export-status { height: 2; color: #3fb950; text-align: center; }
    """

    def __init__(self, session_log: dict[str, "DetectionEntry"]):
        super().__init__()
        self._session_log = session_log   # pid -> DetectionEntry

    def compose(self) -> ComposeResult:
        with Container(id="log-box"):
            yield Label("📊  Detection Log", id="log-screen-title")
            with Container(id="log-table-area"):
                yield DataTable(id="log-table", cursor_type="row", zebra_stripes=True)
            with Horizontal(id="log-btn-row"):
                yield Button("💾  Export CSV",   variant="success", id="btn-export")
                yield Button("🗑  Clear Log",    variant="warning", id="btn-clear-log")
                yield Button("✖   Close",        variant="default", id="btn-log-close")
            yield Label("", id="export-status")
            yield Label("", id="log-summary")

    def on_mount(self):
        self._build_table()

    def _build_table(self):
        table = self.query_one("#log-table", DataTable)
        table.clear(columns=True)
        table.add_columns(
            "Person ID", "Name", "First Detected At",
            "Last Detected At", "Appearances"
        )
        entries = self._session_log
        if not entries:
            self.query_one("#log-summary", Label).update("No detections in this session yet.")
            return
        for entry in sorted(entries.values(), key=lambda e: e.first_seen_at):
            table.add_row(
                entry.person_id,
                entry.name,
                entry.first_seen_at,
                entry.last_seen_at,
                str(entry.detection_count),
                key=entry.person_id,
            )
        self.query_one("#log-summary", Label).update(
            f"{len(entries)} unique face(s) detected this session.")

    @on(Button.Pressed, "#btn-export")
    def on_export(self):
        if not self._session_log:
            self.query_one("#export-status", Label).update("⚠ Nothing to export.")
            return

        ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_path = Path(f"detection_log_{ts}.csv")

        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "person_id", "name",
                "first_detected_at", "last_detected_at", "appearance_count"
            ])
            for entry in sorted(
                self._session_log.values(), key=lambda e: e.first_seen_at
            ):
                writer.writerow([
                    entry.person_id,
                    entry.name,
                    entry.first_seen_at,
                    entry.last_seen_at,
                    entry.detection_count,
                ])

        self.query_one("#export-status", Label).update(
            f"✅ Exported  {len(self._session_log)} rows  →  {out_path.resolve()}")

    @on(Button.Pressed, "#btn-clear-log")
    def on_clear(self):
        self._session_log.clear()
        self._build_table()
        self.query_one("#export-status", Label).update("")

    @on(Button.Pressed, "#btn-log-close")
    def on_close(self): self.dismiss(None)


# ══════════════════════════════════════════════════════════════════════════════
# Modal: Settings
# ══════════════════════════════════════════════════════════════════════════════
class SettingsScreen(ModalScreen):

    CSS = """
    SettingsScreen { align: center middle; }
    #settings-box {
        width: 72; height: auto;
        border: thick $accent;
        background: #161b22;
        padding: 2 4;
    }
    #settings-title {
        text-style: bold; color: #58a6ff;
        text-align: center; margin-bottom: 1;
        border-bottom: solid #30363d; padding-bottom: 1;
    }
    .field-row   { height: 3; margin-bottom: 0; }
    .field-label { color: #8b949e; width: 24; content-align: left middle; }
    Input  { width: 1fr; }
    Select { width: 1fr; }
    #hint  { color: #484f58; text-align: center; margin-top: 1;
             border-top: solid #30363d; padding-top: 1; height: auto; }
    #btn-row { margin-top: 1; height: auto; }
    Button   { margin: 0 1; }
    """

    PROVIDERS = [
        ("CPU  (CPUExecutionProvider)",      "CPUExecutionProvider"),
        ("CUDA (CUDAExecutionProvider)",     "CUDAExecutionProvider"),
        ("CoreML (CoreMLExecutionProvider)", "CoreMLExecutionProvider"),
    ]

    def compose(self) -> ComposeResult:
        with Container(id="settings-box"):
            yield Label("⚙  Settings", id="settings-title")
            with Horizontal(classes="field-row"):
                yield Label("Model name",       classes="field-label")
                yield Input(value=model_name(), id="inp-model-name",
                            placeholder="buffalo_l / buffalo_s / antelopev2")
            with Horizontal(classes="field-row"):
                yield Label("Model root path",  classes="field-label")
                yield Input(value=model_root(), id="inp-model-root",
                            placeholder="Leave blank for default (~/.insightface/models)")
            with Horizontal(classes="field-row"):
                yield Label("ONNX provider",    classes="field-label")
                yield Select(options=self.PROVIDERS, value=model_provider(), id="sel-provider")
            with Horizontal(classes="field-row"):
                yield Label("Det size (W H)",   classes="field-label")
                w, h = model_det_size()
                yield Input(value=f"{w} {h}",   id="inp-det-size", placeholder="640 640")
            with Horizontal(classes="field-row"):
                yield Label("Cosine threshold", classes="field-label")
                yield Input(value=str(CFG["recognition"]["cosine_threshold"]),
                            id="inp-threshold", placeholder="0.40")
            with Horizontal(classes="field-row"):
                yield Label("Capture samples",  classes="field-label")
                yield Input(value=str(capture_samples()),
                            id="inp-samples", placeholder="8")
            with Horizontal(classes="field-row"):
                yield Label("Camera index",     classes="field-label")
                yield Input(value=str(camera_index()),
                            id="inp-cam-idx", placeholder="0")
            with Horizontal(classes="field-row"):
                yield Label("Faces DB path",    classes="field-label")
                yield Input(value=faces_db_path(),
                            id="inp-db-path", placeholder="registered_faces.pkl")
            yield Label(
                "Changes saved to config.yaml and applied immediately.\n"
                "Model reloads on next detection/registration start.",
                id="hint")
            with Horizontal(id="btn-row"):
                yield Button("Save",   variant="primary", id="btn-save")
                yield Button("Cancel", variant="error",   id="btn-cancel")

    @on(Button.Pressed, "#btn-cancel")
    def cancel(self): self.dismiss(False)

    @on(Button.Pressed, "#btn-save")
    def save_settings(self):
        errs  = []
        name  = self.query_one("#inp-model-name", Input).value.strip()
        root  = self.query_one("#inp-model-root", Input).value.strip()
        prov  = self.query_one("#sel-provider",   Select).value
        dsize = self.query_one("#inp-det-size",   Input).value.strip()
        thr   = self.query_one("#inp-threshold",  Input).value.strip()
        samp  = self.query_one("#inp-samples",    Input).value.strip()
        cam   = self.query_one("#inp-cam-idx",    Input).value.strip()
        db    = self.query_one("#inp-db-path",    Input).value.strip()

        try:
            parts = dsize.split(); assert len(parts) == 2
            w, h  = int(parts[0]), int(parts[1])
        except Exception: errs.append("Det size: two integers e.g. '640 640'")

        try:    thr_f  = float(thr);  assert 0 < thr_f < 1
        except: errs.append("Threshold: float 0–1")

        try:    samp_i = int(samp);   assert samp_i >= 1
        except: errs.append("Samples: positive integer")

        try:    cam_i  = int(cam);    assert cam_i >= 0
        except: errs.append("Camera index: non-negative integer")

        if errs:
            self.query_one("#hint", Label).update("⚠ " + "  |  ".join(errs))
            return

        CFG["model"]["name"]                   = name
        CFG["model"]["root"]                   = root
        CFG["model"]["det_size"]               = [w, h]
        CFG["model"]["provider"]               = str(prov)
        CFG["recognition"]["cosine_threshold"] = thr_f
        CFG["recognition"]["capture_samples"]  = samp_i
        CFG["camera"]["device_index"]          = cam_i
        CFG["storage"]["faces_db"]             = db or "registered_faces.pkl"
        save_config(CFG)
        reset_face_app()
        self.dismiss(True)


# ══════════════════════════════════════════════════════════════════════════════
# Main Application
# ══════════════════════════════════════════════════════════════════════════════
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
        border: round #30363d;
        background: #161b22;
        padding: 1 2;
    }
    #panel-title {
        text-style: bold; color: #58a6ff; text-align: center;
        border-bottom: solid #30363d;
        padding-bottom: 1; margin-bottom: 1;
    }
    #status-box {
        height: 8; border: round #30363d;
        background: #0d1117; padding: 1; margin-bottom: 1;
    }
    #detection-status { text-align: center; text-style: bold; color: #8b949e; }
    #registered-count { text-align: center; color: #e3b341; }
    #fps-label        { text-align: center; color: #3fb950; }
    #model-info       { text-align: center; color: #484f58; }

    .sidebar-btn { width: 100%; margin-bottom: 1; }

    #list-title {
        color: #8b949e; text-style: italic;
        margin-top: 1; padding-top: 1;
        border-top: solid #30363d;
    }
    #people-scroll {
        height: 1fr; border: round #21262d;
        background: #0d1117; padding: 0 1;
    }
    .person-entry    { color: #c9d1d9; }
    .person-entry-id { color: #e3b341; }

    #log-panel {
        width: 1fr; height: 1fr;
        border: round #30363d;
        background: #0d1117;
        margin-left: 2; padding: 1;
    }
    #log-title {
        text-style: bold; color: #58a6ff;
        border-bottom: solid #30363d;
        padding-bottom: 1; margin-bottom: 1;
    }
    #event-log {
        height: 1fr;
        background: #0d1117; color: #c9d1d9;
        scrollbar-color: #30363d;
    }
    """

    is_detecting: reactive[bool] = reactive(False)
    face_db: reactive[dict]      = reactive({})

    def on_mount(self):
        self.face_db      = load_faces_db()
        self._stop_event  = threading.Event()
        self._session_log: dict[str, DetectionEntry] = {}   # pid -> DetectionEntry
        self._log_lock    = threading.Lock()
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

    # ── button handlers ──────────────────────────────────────────────
    @on(Button.Pressed, "#btn-register")
    def on_register(self):
        if not INSIGHTFACE_AVAILABLE:
            self._log("❌ InsightFace not installed."); return

        def handle(result):
            if not isinstance(result, RegisterScreen.Registered): return
            db = load_faces_db()
            if result.pid in db:
                db[result.pid]["embeddings"].extend(result.embeddings)
                self._log(f"🔄 Updated [{result.pid}] {result.name} (+{len(result.embeddings)} samples)")
            else:
                db[result.pid] = make_record(result.pid, result.name, result.embeddings)
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
        self.is_detecting = True
        self._set_ui(detecting=True)
        self._stop_event.clear()
        threading.Thread(target=self._detection_loop, daemon=True).start()
        self._log("🔍 Detection started — OpenCV window opening…")

    @on(Button.Pressed, "#btn-stop")
    def on_stop_detect(self):
        if not self.is_detecting: return
        self._stop_event.set()
        self.is_detecting = False
        self._set_ui(detecting=False)
        self._log("⏹ Detection stopped.")

    @on(Button.Pressed, "#btn-det-log")
    def on_det_log(self):
        self.push_screen(DetectionLogScreen(self._session_log))

    @on(Button.Pressed, "#btn-settings")
    def on_settings(self):
        if self.is_detecting:
            self._log("⚠ Stop detection before changing settings."); return

        def handle(saved: bool):
            if saved:
                self._update_model_info()
                self._log(
                    f"✅ Settings saved — model: {model_name()}  "
                    f"root: '{model_root() or 'default'}'  "
                    f"provider: {model_provider()}  threshold: {cosine_threshold()}")

        self.push_screen(SettingsScreen(), handle)

    # ── ui helpers ───────────────────────────────────────────────────
    def _set_ui(self, detecting: bool):
        s = self.query_one("#detection-status", Label)
        s.update("● DETECTING" if detecting else "● IDLE")
        s.styles.color = "#3fb950" if detecting else "#8b949e"
        if not detecting:
            self.query_one("#fps-label", Label).update("")
        # These are disabled while detecting
        for bid in ("#btn-detect", "#btn-register", "#btn-manager", "#btn-settings"):
            self.query_one(bid, Button).disabled = detecting
        # Detection Log is always accessible (even during detection)
        self.query_one("#btn-det-log", Button).disabled = False
        self.query_one("#btn-stop", Button).display = detecting

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
                record = self.face_db[pid]
                name   = record.get("name", "—")
                n      = len(record.get("embeddings", []))
                scroll.mount(Label(
                    f"  [{pid}]  {name}  ({n} samples)", classes="person-entry"))

    def _log(self, msg: str):
        ts = datetime.now().strftime("%H:%M:%S")
        self.query_one("#event-log", Log).write_line(f"[{ts}]  {msg}")

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

        last_identities: set[str] = set()   # set of person_ids seen last frame
        frame_times: list[float]  = []

        while not self._stop_event.is_set():
            t0 = time.perf_counter()
            ret, frame = cap.read()
            if not ret: time.sleep(0.05); continue

            faces            = fa.get(frame)
            current_ids: set[str] = set()
            display          = frame.copy()

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

            # ── session log + event log ─────────────────────────────
            ts = now_ts()
            appeared   = current_ids - last_identities
            disappeared= last_identities - current_ids

            for pid in appeared:
                name = self.face_db.get(pid, {}).get("name", "Unknown") if pid != "unknown" else "Unknown"
                with self._log_lock:
                    if pid in self._session_log:
                        self._session_log[pid].last_seen_at   = ts
                        self._session_log[pid].detection_count += 1
                    else:
                        self._session_log[pid] = DetectionEntry(
                            person_id      = pid,
                            name           = name,
                            first_seen_at  = ts,
                            last_seen_at   = ts,
                            detection_count= 1,
                        )
                if pid == "unknown":
                    self.call_from_thread(self._log, "👤 Unknown face detected")
                else:
                    self.call_from_thread(self._log, f"🟢 Recognized: {name}  [{pid}]")

            for pid in disappeared:
                # update last_seen when leaving frame
                ts_now = now_ts()
                with self._log_lock:
                    if pid in self._session_log:
                        self._session_log[pid].last_seen_at = ts_now
                if pid == "unknown":
                    self.call_from_thread(self._log, "👋 Unknown face left the frame.")
                else:
                    name = self.face_db.get(pid, {}).get("name", pid)
                    self.call_from_thread(self._log, f"👋 {name} [{pid}] left the frame.")

            last_identities = current_ids

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