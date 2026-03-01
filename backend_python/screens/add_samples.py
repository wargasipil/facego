import time

import cv2

from textual.app import ComposeResult
from textual.containers import Container, Horizontal
from textual.message import Message
from textual.screen import ModalScreen
from textual.widgets import Button, Label, ProgressBar
from textual import on, work

from config import camera_index, capture_samples
from face_engine import draw_face_box, get_face_app


class AddSamplesScreen(ModalScreen):

    CSS = """
    AddSamplesScreen { align: center middle; }
    #add-box {
        width: 64; height: auto;
        border: thick $accent; background: #161b22; padding: 2 4;
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
