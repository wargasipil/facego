import numpy as np

from textual.app import ComposeResult
from textual.containers import Container, Horizontal
from textual.screen import ModalScreen
from textual.widgets import Button, Label
from textual import on

from config import faces_db_path


class ViewFaceScreen(ModalScreen):

    CSS = """
    ViewFaceScreen { align: center middle; }
    #view-box {
        width: 62; height: auto;
        border: thick $accent; background: #161b22; padding: 2 4;
    }
    #view-title  { text-style: bold; color: #58a6ff; text-align: center; margin-bottom: 1; }
    .detail-row  { height: 2; }
    .detail-key  { color: #8b949e; width: 22; content-align: left middle; }
    .detail-val  { color: #c9d1d9; width: 1fr; content-align: left middle; }
    .detail-id   { color: #e3b341; width: 1fr; content-align: left middle; }
    #close-btn   { width: 100%; margin-top: 1; }
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
            for key, val, cls in [
                ("Person ID",       pid,               "detail-id"),
                ("Name",            name,              "detail-val"),
                ("Samples stored",  str(len(embs)),    "detail-val"),
                ("Embedding dim",   str(dim),          "detail-val"),
                ("Avg embedding",   f"{avg_norm:.4f}", "detail-val"),
                ("Created at",      created,           "detail-val"),
                ("DB file",         faces_db_path(),   "detail-val"),
            ]:
                with Horizontal(classes="detail-row"):
                    yield Label(key, classes="detail-key")
                    yield Label(val, classes=cls)
            yield Button("Close", variant="primary", id="close-btn")

    @on(Button.Pressed, "#close-btn")
    def close(self): self.dismiss(None)
