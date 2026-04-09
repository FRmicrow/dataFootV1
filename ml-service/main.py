import json
import os
import subprocess
import sys
import time
import warnings
from datetime import datetime
from typing import List, Optional

import joblib
import pandas as pd
from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, normalize_feature_vector
from model_paths import get_global_1x2_model_path
from season_simulation_runner import run_season_simulation

warnings.filterwarnings('ignore', category=UserWarning, module='pandas')

app = FastAPI(title="StatFoot V3 ML Service", version="2.0.0-postgres-only")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = get_global_1x2_model_path()
IMPORTANCE_PATH = os.path.join(os.path.dirname(MODEL_PATH), 'model_1x2_importance.json')

model = None
importance = []

training_status = {
    "is_training": False,
    "last_trained": None,
    "last_metrics": None,
    "error": None
}


class PredictionRequest(BaseModel):
    fixture_id: int


class BatchPredictionRequest(BaseModel):
    fixture_ids: List[int]


class SeasonSimulationRequest(BaseModel):
    simulation_id: int
    league_id: int
    season_year: int
    horizon_type: str = "FULL_HISTORICAL"
    mode: Optional[str] = "STATIC"


@app.on_event("startup")
def load_model():
    global model, importance
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded: {MODEL_PATH}")
    else:
        print(f"⚠️ Warning: Model not found at {MODEL_PATH}")

    if os.path.exists(IMPORTANCE_PATH):
        with open(IMPORTANCE_PATH, 'r') as handle:
            importance = json.load(handle)


def run_training_pipeline():
    global training_status, model, importance
    training_status["is_training"] = True
    training_status["error"] = None

    try:
        feat_proc = subprocess.run(
            [sys.executable, os.path.join(BASE_DIR, 'features.py')],
            capture_output=True,
            text=True,
        )
        if feat_proc.returncode != 0:
            raise Exception(f"Feature engineering failed: {feat_proc.stderr}")

        train_proc = subprocess.run(
            [sys.executable, os.path.join(BASE_DIR, 'train_1x2.py')],
            capture_output=True,
            text=True,
        )
        if train_proc.returncode != 0:
            raise Exception(f"Model training failed: {train_proc.stderr}")

        model = joblib.load(MODEL_PATH)
        if os.path.exists(IMPORTANCE_PATH):
            with open(IMPORTANCE_PATH, 'r') as handle:
                importance = json.load(handle)

        training_status["last_trained"] = datetime.now().isoformat()
        training_status["is_training"] = False
    except Exception as exc:
        print(f"❌ [ML] Retraining pipeline failed: {exc}")
        training_status["is_training"] = False
        training_status["error"] = str(exc)


def _load_feature_vector(fixture_id: int):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT feature_vector FROM V3_ML_Feature_Store WHERE fixture_id = %s", (fixture_id,))
        row = cur.fetchone()
        cur.close()
        return row
    finally:
        conn.close()


@app.get("/health")
def health():
    return {
        "status": "online",
        "model_loaded": model is not None,
        "version": app.version,
        "training": training_status
    }


@app.post("/predict")
def predict(request: PredictionRequest):
    start_time = time.time()

    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        row = _load_feature_vector(request.fixture_id)
        if not row:
            raise HTTPException(status_code=404, detail=f"Features not found for fixture {request.fixture_id}")

        vector = normalize_feature_vector(json.loads(row[0]))
        features = pd.DataFrame([vector], columns=GLOBAL_1X2_FEATURE_COLUMNS)
        probs = model.predict_proba(features)[0]

        duration = time.time() - start_time
        return {
            "success": True,
            "fixture_id": request.fixture_id,
            "probabilities": {
                "home": round(float(probs[1]), 4),
                "draw": round(float(probs[0]), 4),
                "away": round(float(probs[2]), 4)
            },
            "top_features": importance[:5],
            "model_version": app.version,
            "latency": round(duration, 4)
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/batch_predict")
def batch_predict(request: BatchPredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        conn = get_connection()
        cur = conn.cursor()
        placeholders = ','.join(['%s'] * len(request.fixture_ids))
        query = f"SELECT fixture_id, feature_vector FROM V3_ML_Feature_Store WHERE fixture_id IN ({placeholders})"
        cur.execute(query, request.fixture_ids)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        results = []
        for fixture_id, vector_json in rows:
            vector = normalize_feature_vector(json.loads(vector_json))
            features = pd.DataFrame([vector], columns=GLOBAL_1X2_FEATURE_COLUMNS)
            probs = model.predict_proba(features)[0]
            results.append({
                "fixture_id": fixture_id,
                "probabilities": {
                    "home": round(float(probs[1]), 4),
                    "draw": round(float(probs[0]), 4),
                    "away": round(float(probs[2]), 4)
                }
            })

        return {
            "success": True,
            "results": results,
            "model_version": app.version
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/train")
def train(background_tasks: BackgroundTasks):
    if training_status["is_training"]:
        return {"success": False, "message": "Training already in progress"}

    background_tasks.add_task(run_training_pipeline)
    return {"success": True, "message": "Training pipeline started in background"}


@app.get("/train/status")
def get_train_status():
    return training_status


@app.post("/simulations/run")
def start_season_simulation(request: SeasonSimulationRequest, background_tasks: BackgroundTasks):
    if request.mode not in (None, "STATIC", "WALK_FORWARD"):
        raise HTTPException(status_code=400, detail=f"Unsupported simulation mode: {request.mode}")

    background_tasks.add_task(
        run_season_simulation,
        request.simulation_id,
        request.league_id,
        request.season_year,
        request.horizon_type,
    )

    return {
        "success": True,
        "message": "Season simulation accepted.",
        "simulation_id": request.simulation_id,
    }


@app.get("/predict/fixture/{fixture_id}")
def predict_fixture_all(fixture_id: int):
    try:
        from src.orchestrator.predictor import generate_master_prediction
        return generate_master_prediction(fixture_id)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8008)
