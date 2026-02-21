"""
config.py — Central configuration for the ML service.

Loads environment variables from .env (or system env) and exposes
typed settings consumed by all other modules.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve the directory where THIS file lives (ml-service/)
_SERVICE_DIR = Path(__file__).parent.resolve()

# Load .env from ml-service/ (if present)
_env_path = _SERVICE_DIR / ".env"
load_dotenv(dotenv_path=_env_path)


def _resolve(raw: str) -> Path:
    """Resolve a path that may be relative (to ml-service/) or absolute."""
    p = Path(raw)
    if not p.is_absolute():
        p = (_SERVICE_DIR / p).resolve()
    return p


# ── Core paths ──────────────────────────────────────────────────────────────
DB_PATH: Path = _resolve(os.getenv("DB_PATH", "../backend/database.sqlite"))
MODEL_DIR: Path = _resolve(os.getenv("MODEL_DIR", "./saved_models"))

# Ensure model directory exists
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# ── Server ───────────────────────────────────────────────────────────────────
PORT: int = int(os.getenv("PORT", "5050"))

# ── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

# ── ML Hyper-parameters (can be overridden via env) ──────────────────────────
MIN_TRAIN_SAMPLES: int = int(os.getenv("MIN_TRAIN_SAMPLES", "500"))
ELO_K_FACTOR: float = float(os.getenv("ELO_K_FACTOR", "20"))
ELO_HOME_ADVANTAGE: float = float(os.getenv("ELO_HOME_ADVANTAGE", "100"))
ELO_START: float = float(os.getenv("ELO_START", "1500"))
FORM_WINDOW: int = int(os.getenv("FORM_WINDOW", "5"))

# ── Edge / Kelly thresholds ───────────────────────────────────────────────────
EDGE_THRESHOLD_SHOW: float = 0.03     # minimum edge to show any recommendation
EDGE_THRESHOLD_BACKTEST: float = 0.05  # minimum edge to place a simulated bet
KELLY_FRACTION: float = 0.25           # quarter-Kelly
KELLY_MAX_STAKE: float = 0.05          # hard cap: 5 % of bankroll
