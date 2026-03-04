from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import joblib
import pandas as pd
import json
import os
import sqlite3
import subprocess
import sys
import time
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="StatFoot V3 ML Service", version="1.3.0-catboost-1x2")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.getenv('MODELS_PATH', BASE_DIR)
MODEL_PATH = os.path.join(MODELS_DIR, 'model_1x2.joblib')
IMPORTANCE_PATH = os.path.join(MODELS_DIR, 'model_1x2_importance.json')
DB_PATH = os.getenv('DATABASE_PATH', os.path.abspath(os.path.join(BASE_DIR, '..', 'backend', 'database.sqlite')))

# Global model state
model = None
importance = []

# Global training state
training_status = {
    "is_training": False,
    "last_trained": None,
    "last_metrics": None,
    "error": None
}

@app.on_event("startup")
def load_model():
    global model, importance
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        print(f"✅ Model loaded: {MODEL_PATH}")
    else:
        print(f"⚠️ Warning: Model not found at {MODEL_PATH}")
    
    if os.path.exists(IMPORTANCE_PATH):
        with open(IMPORTANCE_PATH, 'r') as f:
            importance = json.load(f)

class PredictionRequest(BaseModel):
    fixture_id: int

class BatchPredictionRequest(BaseModel):
    fixture_ids: List[int]

def run_training_pipeline():
    global training_status, model, importance
    training_status["is_training"] = True
    training_status["error"] = None
    
    try:
        print("🚀 [ML] Starting automated retraining pipeline...")
        
        # 1. Run Feature Engineering
        print("   🔹 Step 1/2: Refreshing Feature Store...")
        feat_proc = subprocess.run([sys.executable, os.path.join(BASE_DIR, 'features.py')], 
                                   capture_output=True, text=True)
        if feat_proc.returncode != 0:
            raise Exception(f"Feature engineering failed: {feat_proc.stderr}")
            
        # 2. Run Training
        print("   🔹 Step 2/2: Training Model...")
        train_proc = subprocess.run([sys.executable, os.path.join(BASE_DIR, 'train_1x2.py')], 
                                    capture_output=True, text=True)
        if train_proc.returncode != 0:
            raise Exception(f"Model training failed: {train_proc.stderr}")
            
        # 3. Reload Model
        print("   🔹 Reloading newly trained model...")
        model = joblib.load(MODEL_PATH)
        if os.path.exists(IMPORTANCE_PATH):
            with open(IMPORTANCE_PATH, 'r') as f:
                importance = json.load(f)
                
        training_status["last_trained"] = datetime.now().isoformat()
        training_status["is_training"] = False
        print("✅ [ML] Retraining pipeline completed successfully.")
        
    except Exception as e:
        print(f"❌ [ML] Retraining pipeline failed: {str(e)}")
        training_status["is_training"] = False
        training_status["error"] = str(e)

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
        conn = sqlite3.connect(DB_PATH)
        query = "SELECT feature_vector FROM V3_ML_Feature_Store WHERE fixture_id = ?"
        row = conn.execute(query, (request.fixture_id,)).fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail=f"Features not found for fixture {request.fixture_id}")
        
        vector = json.loads(row[0])
        X = pd.DataFrame([vector])
        
        probs = model.predict_proba(X)[0] 
        # Label mapping (standardized in training): 0=Draw, 1=Home, 2=Away
        
        duration = time.time() - start_time
        print(f"⏱️ Prediction for fixture {request.fixture_id} took {duration:.4f}s")
        
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
def train(background_tasks: BackgroundTasks):
    if training_status["is_training"]:
        return {"success": False, "message": "Training already in progress"}
    
    background_tasks.add_task(run_training_pipeline)
    return {"success": True, "message": "Training pipeline started in background"}

@app.get("/train/status")
def get_train_status():
    return training_status

@app.post("/batch_predict")
def batch_predict(request: BatchPredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        placeholders = ','.join(['?'] * len(request.fixture_ids))
        query = f"SELECT fixture_id, feature_vector FROM V3_ML_Feature_Store WHERE fixture_id IN ({placeholders})"
        rows = conn.execute(query, request.fixture_ids).fetchall()
        conn.close()

        results = []
        for fid, vector_json in rows:
            vector = json.loads(vector_json)
            X = pd.DataFrame([vector])
            probs = model.predict_proba(X)[0]
            results.append({
                "fixture_id": fid,
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ForgeBuildRequest(BaseModel):
    league_id: int
    season_year: Optional[int] = None

# Global forge build state
forge_build_status = {
    "is_building": False,
    "league_id": None,
    "progress": {},
    "error": None
}
forge_build_cancel_requested = False

def run_forge_build_pipeline(league_id: int, season_year: int = None):
    """Background task: Builds all 3 horizon models for a league."""
    global forge_build_status, forge_build_cancel_requested
    forge_build_status["is_building"] = True
    forge_build_status["league_id"] = league_id
    forge_build_status["progress"] = {}
    forge_build_status["error"] = None
    forge_build_cancel_requested = False
    
    try:
        from train_forge import train_model as forge_train
        
        horizons = ['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING']
        for horizon in horizons:
            if forge_build_cancel_requested:
                print(f"🛑 Build cancelled by user before starting {horizon}")
                forge_build_status["error"] = "Build cancelled by user."
                break

            print(f"\n🔨 Building {horizon} model for league {league_id}...")
            forge_build_status["progress"][horizon] = "training"
            
            result = forge_train(
                league_id=league_id,
                horizon_type=horizon,
                season_year=season_year
            )
            
            if result:
                forge_build_status["progress"][horizon] = "completed"
                print(f"   ✅ {horizon}: {result}")
            else:
                forge_build_status["progress"][horizon] = "failed"
                print(f"   ❌ {horizon}: Training failed")
        
        forge_build_status["is_building"] = False
        print(f"\n🏆 Model build process finished for league {league_id}")
        
    except Exception as e:
        print(f"❌ Forge build pipeline failed: {e}")
        forge_build_status["is_building"] = False
        forge_build_status["error"] = str(e)

@app.post("/forge/build-models")
def build_forge_models(request: ForgeBuildRequest, background_tasks: BackgroundTasks):
    """Build all 3 horizon models (FULL, 5Y, 3Y) for a league."""
    if forge_build_status["is_building"]:
        return {"success": False, "message": f"Build already in progress for league {forge_build_status['league_id']}"}
    
    background_tasks.add_task(run_forge_build_pipeline, request.league_id, request.season_year)
    return {"success": True, "message": f"Building 3 models for league {request.league_id}..."}

@app.post("/forge/cancel-build")
def cancel_forge_build():
    """Request to cancel the current model build."""
    global forge_build_cancel_requested
    if not forge_build_status["is_building"]:
        return {"success": False, "message": "No build in progress to cancel."}
    
    forge_build_cancel_requested = True
    return {"success": True, "message": "Build cancellation requested."}

@app.get("/forge/build-status")
def get_forge_build_status():
    """Returns the current model build status."""
    return forge_build_status

@app.get("/forge/models")
def list_forge_models():
    """Returns all registered models from the V3_Model_Registry."""
    try:
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute("""
            SELECT id, league_id, horizon_type, version_tag, accuracy, log_loss, brier_score,
                   training_dataset_size, model_path, trained_at, is_active
            FROM V3_Model_Registry
            ORDER BY trained_at DESC
        """).fetchall()
        conn.close()
        
        models = []
        for row in rows:
            models.append({
                "id": row[0], "league_id": row[1], "horizon_type": row[2],
                "version_tag": row[3], "accuracy": row[4], "log_loss": row[5],
                "brier_score": row[6], "training_dataset_size": row[7],
                "model_path": row[8], "trained_at": row[9], "is_active": row[10]
            })
        return {"success": True, "models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Retrain from Simulation Results ──

class ForgeRetrainRequest(BaseModel):
    model_id: int
    simulation_id: int

# Global retrain state
forge_retrain_status = {
    "is_retraining": False,
    "model_id": None,
    "simulation_id": None,
    "result": None,
    "error": None
}

def run_retrain_pipeline(model_id: int, simulation_id: int):
    """Background task: retrain a model from simulation results."""
    global forge_retrain_status
    forge_retrain_status["is_retraining"] = True
    forge_retrain_status["model_id"] = model_id
    forge_retrain_status["simulation_id"] = simulation_id
    forge_retrain_status["result"] = None
    forge_retrain_status["error"] = None
    
    try:
        from retrain_forge import retrain_from_simulation
        result = retrain_from_simulation(model_id, simulation_id)
        forge_retrain_status["result"] = result
        forge_retrain_status["is_retraining"] = False
        print(f"🏆 Retrain pipeline complete: {result.get('status')}")
    except Exception as e:
        print(f"❌ Retrain pipeline failed: {e}")
        forge_retrain_status["is_retraining"] = False
        forge_retrain_status["error"] = str(e)

@app.post("/forge/retrain")
def retrain_forge_model(request: ForgeRetrainRequest, background_tasks: BackgroundTasks):
    """Re-train a model using error signals from a completed simulation."""
    if forge_retrain_status["is_retraining"]:
        return {"success": False, "message": "A retrain is already in progress."}
    
    background_tasks.add_task(run_retrain_pipeline, request.model_id, request.simulation_id)
    return {"success": True, "message": f"Retraining model #{request.model_id} from simulation #{request.simulation_id}..."}

@app.get("/forge/retrain-status")
def get_retrain_status():
    """Returns the current retrain status."""
    return forge_retrain_status

@app.get("/forge/eligible-horizons")
def get_eligible_horizons(league_id: int, season_year: int):
    """Returns which horizon models are eligible for a given season year."""
    try:
        from retrain_forge import get_eligible_horizons
        horizons = get_eligible_horizons(league_id, season_year)
        return {"success": True, "eligible": horizons, "league_id": league_id, "season_year": season_year}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/forge/league-models/{league_id}")
def get_league_models(league_id: int):
    """Returns active models for a specific league."""
    try:
        conn = sqlite3.connect(DB_PATH)
        rows = conn.execute("""
            SELECT id, horizon_type, version_tag, accuracy, log_loss, brier_score,
                   training_dataset_size, trained_at, is_active
            FROM V3_Model_Registry
            WHERE league_id = ? AND is_active = 1
            ORDER BY horizon_type
        """, (league_id,)).fetchall()
        conn.close()
        
        models = []
        for row in rows:
            models.append({
                "id": row[0], "horizon_type": row[1], "version_tag": row[2],
                "accuracy": row[3], "log_loss": row[4], "brier_score": row[5],
                "training_dataset_size": row[6], "trained_at": row[7], "is_active": row[8]
            })
        return {"success": True, "models": models, "has_models": len(models) > 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/predict/fixture/{fixture_id}")
def predict_fixture_all(fixture_id: int):
    """
    US-1912 Orchestrator API:
    Synchronously runs all Phase 3 ML Submodels (FT, HT, Corners, Cards) 
    for a given fixture, aggregates their probabilities, and saves them to DB.
    """
    try:
        from src.orchestrator.predictor import generate_master_prediction
        result = generate_master_prediction(fixture_id)
        if not result["success"]:
            raise HTTPException(status_code=500, detail="All submodels failed to generate predictions.")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8008)

