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

app = FastAPI(title="StatFoot V3 ML Service", version="1.2.0-rf-1x2")

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model_1x2.joblib')
IMPORTANCE_PATH = os.path.join(BASE_DIR, 'model_1x2_importance.json')
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'backend', 'database.sqlite'))

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
        
        probs = model.predict_proba(X)[0] # [Home, Draw, Away]
        
        duration = time.time() - start_time
        print(f"⏱️ Prediction for fixture {request.fixture_id} took {duration:.4f}s")
        
        return {
            "success": True,
            "fixture_id": request.fixture_id,
            "probabilities": {
                "home": round(float(probs[0]), 4),
                "draw": round(float(probs[1]), 4),
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
                    "home": round(float(probs[0]), 4),
                    "draw": round(float(probs[1]), 4),
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)
