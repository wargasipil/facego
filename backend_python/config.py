"""
Configuration — load/save YAML config, default values, and accessor functions.
"""

from pathlib import Path

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

# ── Paths & constants ─────────────────────────────────────────────────────────

CONFIG_PATH    = Path(__file__).parent / "config.yaml"
PREVIEW_WINDOW = "InsightFace — Camera Preview"

# ── Defaults ──────────────────────────────────────────────────────────────────

DEFAULT_CONFIG: dict = {
    "model": {
        "name":     "buffalo_l",
        "root":     "",
        "det_size": [640, 640],
        "provider": "CPUExecutionProvider",
    },
    "recognition": {
        "cosine_threshold": 0.40,
        "capture_samples":  8,
    },
    "camera": {
        "device_index":       0,
        "detection_interval": 0.03,
    },
    "storage": {
        "faces_db": "registered_faces.pkl",
    },
    "clickhouse": {
        "host":           "localhost",
        "port":           8123,
        "database":       "facego",
        "username":       "facego",
        "password":       "facego_secret",
        "flush_interval": 30,
    },
    "backend": {
        "url":      "http://localhost:8080",
        "username": "admin",
        "password": "admin123",
    },
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

# ── Accessors ─────────────────────────────────────────────────────────────────

def model_name()        -> str:   return CFG["model"]["name"]
def model_root()        -> str:   return CFG["model"]["root"]
def model_det_size()    -> tuple: return tuple(CFG["model"]["det_size"])
def model_provider()    -> str:   return CFG["model"]["provider"]
def cosine_threshold()  -> float: return float(CFG["recognition"]["cosine_threshold"])
def capture_samples()   -> int:   return int(CFG["recognition"]["capture_samples"])
def camera_index()      -> int:   return int(CFG["camera"]["device_index"])
def detect_interval()   -> float: return float(CFG["camera"]["detection_interval"])
def faces_db_path()     -> str:   return CFG["storage"]["faces_db"]
def ch_host()           -> str:   return CFG["clickhouse"]["host"]
def ch_port()           -> int:   return int(CFG["clickhouse"]["port"])
def ch_database()       -> str:   return CFG["clickhouse"]["database"]
def ch_username()       -> str:   return CFG["clickhouse"]["username"]
def ch_password()       -> str:   return CFG["clickhouse"]["password"]
def ch_flush_interval() -> int:   return int(CFG["clickhouse"]["flush_interval"])
def backend_url()       -> str:   return CFG["backend"]["url"]
def backend_username()  -> str:   return CFG["backend"]["username"]
def backend_password()  -> str:   return CFG["backend"]["password"]
