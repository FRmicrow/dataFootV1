"""
main.py — FastAPI entry point for the ML Inference Service (US_023)
====================================================================

Routes
------
GET  /health            Liveness check
POST /predict           Predict outcome probabilities for a fixture
POST /train             Trigger model retraining (manual, local only)
GET  /model/current     Return active model metadata
POST /backtest          Run walk-forward backtesting on a league/date range

Architecture
------------
• Listens on port 5050 (Node.js on 3001, React on 5173 — no conflicts).
• Reads from backend/database.sqlite in READ-ONLY mode.
• Node.js is the ONLY writer to the SQLite database.

Run
---
    uvicorn main:app --port 5050 --reload
"""

from __future__ import annotations

import logging
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── project imports ───────────────────────────────────────────────────────────
from config import DB_PATH, MODEL_DIR, PORT, LOG_LEVEL
from db.reader import get_db_path, table_exists
from features.builder import build_features, FEATURE_COLUMNS
from models.predictor import (
    predict_1x2,
    predict_ou25,
    get_model_meta,
    reload_models,
)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("ml-service")

# --- Training management globals ---
TRAIN_LOG_FILE = Path(__file__).parent / "trainer_progress.log"
training_process: Optional[subprocess.Popen] = None
training_start_time: Optional[str] = None
training_request: Optional[TrainRequest] = None

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="⚽ StatFoot ML Intelligence Service",
    description=(
        "Python FastAPI microservice for LightGBM football match predictions, "
        "betting edge calculation, and walk-forward backtesting."
    ),
    version="4.0.0",
    docs_url="/docs",
)

# Allow calls from Node.js (port 3001) and React dev server (port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3001"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ── Pydantic schemas ──────────────────────────────────────────────────────────


class PredictRequest(BaseModel):
    fixture_id: int = Field(..., description="Internal fixture_id from V3_Fixtures")
    fixture_date: Optional[str] = Field(
        None,
        description=(
            "ISO date string 'YYYY-MM-DD'. If omitted, features are built from fixture_id."
        ),
    )
    home_team_id: Optional[int] = Field(None, description="Pass to skip DB lookup for speed")
    away_team_id: Optional[int] = Field(None, description="Pass to skip DB lookup for speed")
    league_id: Optional[int] = Field(None, description="Pass to skip DB lookup for speed")
    features: Optional[Dict[str, Any]] = Field(
        None,
        description=(
            "Pre-computed feature dict. If provided, skips feature engineering entirely "
            "(Node may pre-compute and pass features directly for speed)."
        ),
    )
    target: str = Field(
        "1x2",
        description="'1x2' (default) or 'ou25'",
    )


class TrainRequest(BaseModel):
    target: str = Field("all", description="'1x2', 'ou25', or 'all'")
    limit: int = Field(10000, description="Max matches to use for training")
    league_ids: Optional[List[int]] = Field(None, description="Target specific leagues (US_033)")


class BacktestRequest(BaseModel):
    league_ids: List[int] = Field(
        default_factory=list,
        description="List of internal league IDs. Empty = all leagues."
    )
    start_date: str = Field(..., description="YYYY-MM-DD start of backtest window")
    end_date: Optional[str] = Field(None, description="YYYY-MM-DD end (default: today)")


class EmpowerRequest(BaseModel):
    league_id: int = Field(..., description="Internal league ID to empower")
    force_rebuild: bool = Field(False, description="If true, clears existing store for this league")


# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/health", tags=["Infrastructure"])
def health():
    """
    Liveness check.
    Returns DB path, model directory, and whether a trained model is available.
    """
    db_ok = get_db_path().exists()
    models_1x2 = list(MODEL_DIR.glob("1x2_v*.pkl"))
    models_ou25 = list(MODEL_DIR.glob("ou25_v*.pkl"))

    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "db_path": str(get_db_path()),
        "db_exists": db_ok,
        "model_dir": str(MODEL_DIR),
        "models": {
            "1x2": {
                "available": len(models_1x2) > 0,
                "count": len(models_1x2),
            },
            "ou25": {
                "available": len(models_ou25) > 0,
                "count": len(models_ou25),
            },
        },
    }


@app.get("/model/current", tags=["Models"])
def get_current_model(target: str = "1x2"):
    """
    Return metadata for the currently loaded (latest) model.
    """
    meta = get_model_meta(target)
    if "error" in meta:
        raise HTTPException(status_code=404, detail=meta["error"])
    return meta


@app.post("/predict", tags=["Inference"])
def predict(req: PredictRequest):
    """
    Predict match outcome probabilities.

    Accepts either:
    • A pre-computed `features` dict (Node-supplied → fastest path).
    • fixture metadata (fixture_id, fixture_date, home/away team IDs, league_id)
      → features computed server-side.

    Returns calibrated probabilities + SHAP-based top features.
    """
    features = req.features

    if features is None:
        # Build features server-side (requires all fixture metadata)
        if not all([req.fixture_date, req.home_team_id, req.away_team_id, req.league_id]):
            # Attempt DB lookup if not provided
            from db.reader import fetch_one
            row = fetch_one(
                """
                SELECT date, home_team_id, away_team_id, league_id
                FROM V3_Fixtures
                WHERE fixture_id = ?
                """,
                (req.fixture_id,),
            )
            if row is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Fixture {req.fixture_id} not found in database.",
                )
            fixture_date = str(row["date"])[:10]
            home_team_id = int(row["home_team_id"])
            away_team_id = int(row["away_team_id"])
            league_id = int(row["league_id"])
        else:
            fixture_date = req.fixture_date
            home_team_id = req.home_team_id
            away_team_id = req.away_team_id
            league_id = req.league_id

        try:
            features = build_features(
                fixture_id=req.fixture_id,
                fixture_date=fixture_date,
                home_team_id=home_team_id,
                away_team_id=away_team_id,
                league_id=league_id,
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Feature engineering failed: {str(e)}")

    # Run prediction
    try:
        if req.target == "ou25":
            result = predict_ou25(features)
        else:
            result = predict_1x2(features)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Model not trained yet. Run: python -m models.trainer --target {req.target}. Error: {str(e)}",
        )
    except Exception as e:
        logger.exception("Prediction error for fixture %d", req.fixture_id)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    result["fixture_id"] = req.fixture_id
    return result


@app.post("/train", tags=["Training"])
async def trigger_training(req: TrainRequest):
    """
    Trigger model retraining. Use subprocess.Popen to avoid blocking and allow tracking.
    """
    global training_process, training_start_time, training_request
    
    if training_process and training_process.poll() is None:
        return {
            "status": "busy",
            "message": "A training process is already running."
        }

    training_start_time = datetime.now().isoformat()
    training_request = req
    
    # Path to the venv python
    python_path = str(Path(__file__).parent / "venv" / "bin" / "python")
    if not os.path.exists(python_path):
        python_path = sys.executable

    # Clear old log
    if TRAIN_LOG_FILE.exists():
        TRAIN_LOG_FILE.unlink()

    logger.info("Starting training subprocess: %s --limit %d", req.target, req.limit)
    
    # Construct command
    cmd = [python_path, "-m", "models.trainer", "--target", req.target, "--limit", str(req.limit)]
    if req.league_ids:
        cmd.extend(["--league", ",".join(map(str, req.league_ids))])

    with open(TRAIN_LOG_FILE, "w") as log_f:
        training_process = subprocess.Popen(
            cmd,
            stdout=log_f,
            stderr=subprocess.STDOUT,
            cwd=str(MODEL_DIR.parent),
        )

    return {
        "status": "started",
        "pid": training_process.pid,
        "message": f"Training for {req.target} started (limit: {req.limit}).",
    }


@app.get("/model/train/status", tags=["Training"])
def get_training_status():
    global training_process
    
    if training_process is None:
        return {"status": "idle"}
    
    exit_code = training_process.poll()
    if exit_code is None:
        # Check if the log file is being updated
        progress = "Building features..."
        if TRAIN_LOG_FILE.exists():
            try:
                with open(TRAIN_LOG_FILE, "r") as f:
                    lines = f.readlines()
                    if lines:
                        last_line = lines[-1].strip()
                        if "Building features" in last_line:
                            progress = last_line
                        elif "Training" in last_line:
                            progress = last_line
                        elif "complete" in last_line.lower():
                            progress = "Wrapping up..."
            except: pass

        return {
            "status": "running",
            "pid": training_process.pid,
            "start_time": training_start_time,
            "request": training_request,
            "current_step": progress
        }
    
    return {
        "status": "finished",
        "exit_code": exit_code,
        "finished_at": datetime.now().isoformat() if exit_code == 0 else None,
        "error": "Training failed" if exit_code != 0 else None
    }


@app.get("/model/train/logs", tags=["Training"])
def get_training_logs(lines: int = 50):
    if not TRAIN_LOG_FILE.exists():
        return {"logs": []}
    
    try:
        with open(TRAIN_LOG_FILE, "r") as f:
            content = f.readlines()
            return {"logs": [l.strip() for l in content[-lines:]]}
    except Exception as e:
        return {"error": str(e)}


@app.post("/model/train/stop", tags=["Training"])
def stop_training():
    global training_process
    if training_process and training_process.poll() is None:
        training_process.terminate()
        return {"status": "stopped", "message": "Training process terminated."}
    return {"status": "idle", "message": "No process to stop."}


@app.post("/backtest", tags=["Backtesting"])
def run_backtest_endpoint(req: BacktestRequest):
    """
    Run walk-forward backtesting for specified leagues and date range.
    ⚠️  This is a synchronous endpoint and may take several minutes for large datasets.
    """
    from backtesting.engine import run_backtest

    try:
        results = run_backtest(
            league_ids=req.league_ids,
            start_date=req.start_date,
            end_date=req.end_date,
        )
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Backtest error")
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")


@app.post("/empower", tags=["Empowerment"])
async def empower_league_endpoint(req: EmpowerRequest, background_tasks: BackgroundTasks):
    """
    Trigger surgical empowerment for a specific league (US_030).
    Processes only matches not already in the Feature Store (Delta Logic).
    Runs as a background task.
    """
    from features.builder import empower_league

    def _do_empower():
        logger.info(f"Background empowerment started for league {req.league_id}")
        try:
            results = empower_league(req.league_id, req.force_rebuild)
            logger.info(f"Empowerment complete for league {req.league_id}: {results}")
        except Exception as e:
            logger.error(f"Empowerment failed for league {req.league_id}: {e}")

    background_tasks.add_task(_do_empower)

    return {
        "status": "accepted",
        "message": f"Empowerment for league {req.league_id} started in background.",
        "league_id": req.league_id
    }



@app.post("/features/build", tags=["Features"])
def build_features_endpoint(
    fixture_id: int,
    fixture_date: str,
    home_team_id: int,
    away_team_id: int,
    league_id: int,
):
    """
    Build and return the raw feature vector for a fixture (debug endpoint).
    Useful for inspecting features before running /predict.
    """
    try:
        features = build_features(
            fixture_id=fixture_id,
            fixture_date=fixture_date,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            league_id=league_id,
        )
        return {"fixture_id": fixture_id, "features": features, "feature_count": len(features)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Dev server entry ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
