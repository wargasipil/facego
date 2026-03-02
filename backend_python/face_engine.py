"""
Face engine — InsightFace model singleton, face DB (pickle), validation, matching, drawing.
"""

import os
import pickle
import re
import threading
from datetime import datetime

import cv2
import numpy as np

from config import (
    camera_index, cosine_threshold, faces_db_path,
    model_det_size, model_name, model_provider, model_root,
)

try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False

# ── Face DB ───────────────────────────────────────────────────────────────────

def make_record(person_id: str, name: str, embeddings: list, user_id: str = "") -> dict:
    return {
        "person_id":  person_id,
        "user_id":    user_id,   # backend integer user ID (str) for attendance sync
        "name":       name,
        "embeddings": embeddings,
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }


def load_faces_db() -> dict:
    """Load face DB from the backend via gRPC.

    Returns a dict keyed by str(backend_user_id):
        {
            "person_id":  str,
            "user_id":    str,
            "name":       str,
            "embeddings": list[np.ndarray],
            "created_at": str,
        }
    Falls back to empty dict when gRPC is unavailable or the call fails.
    """
    from backend_client import GRPC_AVAILABLE, get_backend_client
    if not GRPC_AVAILABLE:
        return {}
    try:
        client    = get_backend_client()
        records   = client.list_face_embeddings()   # [{student_id: int, embeddings: [...]}]
        all_users = client.list_users(page_size=200)
        user_map  = {u["id"]: u for u in all_users}  # str(id) → user dict
        db = {}
        for r in records:
            uid_str = str(r["student_id"])
            u       = user_map.get(uid_str, {})
            db[uid_str] = {
                "person_id":  uid_str,
                "user_id":    uid_str,
                "name":       u.get("name", "Unknown"),
                "embeddings": r["embeddings"],
                "created_at": "",
            }
        return db
    except Exception as e:
        import logging
        logging.warning("load_faces_db: backend RPC failed: %s", e)
        return {}


def save_faces_db(db: dict):
    """No-op — face embeddings are now saved via per-operation RPC calls."""
    pass


# ── Validation ────────────────────────────────────────────────────────────────

_ID_PATTERN = re.compile(r"^[A-Za-z0-9_\-]{1,32}$")


def validate_person_id(pid: str, db: dict, exclude_pid: str = "") -> str | None:
    """Return an error string, or None if valid."""
    pid = pid.strip()
    if not pid:
        return "Person ID cannot be empty."
    if not _ID_PATTERN.match(pid):
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
    return None


# ── Matching & drawing ────────────────────────────────────────────────────────

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


# ── InsightFace model — lazy singleton ────────────────────────────────────────

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
