# US_023 - [INFRA] Python ML Microservice Setup

## Title
[INFRA] Bootstrap Python FastAPI ML Service & Integrate with Node

## User Story
**As a** ML Architect  
**I want** to create a standalone Python FastAPI service that handles all machine learning operations  
**So that** the Node.js backend remains clean and focused on orchestration while Python handles the ML ecosystem it excels at.

## Acceptance Criteria

### AC 1: Python Service Bootstrap
- **Given** the monorepo at `/statFootV3`
- **Then** create a new folder `/statFootV3/ml-service/` with this structure:
  ```
  ml-service/
  ├── main.py                  # FastAPI entry point
  ├── requirements.txt         # All Python dependencies
  ├── .env.example             # DB path, model dir, port
  ├── config.py                # Loads env and paths
  ├── db/
  │   └── reader.py            # Read-only SQLite access via Pandas
  ├── features/
  │   └── builder.py           # Feature engineering (ELO, form, fatigue)
  ├── models/
  │   ├── trainer.py           # LightGBM training pipeline
  │   ├── predictor.py         # Load model + predict
  │   └── calibrator.py        # Platt scaling / isotonic
  ├── backtesting/
  │   └── engine.py            # Walk-forward backtest
  └── saved_models/            # .pkl + meta.json files
      └── .gitkeep
  ```

### AC 2: Dependencies (`requirements.txt`)
```
fastapi==0.110.0
uvicorn==0.27.1
lightgbm==4.3.0
scikit-learn==1.4.1
pandas==2.2.1
shap==0.44.1
python-dotenv==1.0.1
requests==2.31.0
```

### AC 3: FastAPI Routes
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Liveness check |
| POST | `/predict` | Predict outcome probabilities for a fixture |
| POST | `/train` | Trigger model retraining (manual, no HTTP auth needed for local) |
| GET | `/model/current` | Return current active model metadata |
| POST | `/backtest` | Run walk-forward backtesting on a league/date range |

### AC 4: Node Integration
- **Given** Node needs ML predictions
- **Then** a new service `backend/src/services/mlService.js` wraps HTTP calls to `http://localhost:5050` using `axios`.
- **And** uses a `ML_SERVICE_URL` env variable (`default: http://localhost:5050`).
- **And** adds a graceful fallback: if the ML service is down, return `{ prediction: null, edge: null }` (never crash the main app).

### AC 5: Launch Instructions (Critical)
The `README.ml.md` at the root must document:
```bash
# Setup (one-time)
cd ml-service
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run (every session alongside npm run dev)
uvicorn main:app --port 5050 --reload
```
The `package.json` root should add script:
```json
"ml:dev": "cd ml-service && source venv/bin/activate && uvicorn main:app --port 5050 --reload"
```

## Technical Notes
- **Shared DB**: The Python service reads the **same** `backend/database.sqlite`. It MUST be read-only (`sqlite3.connect(db_path, check_same_thread=False)`  with `PRAGMA query_only=ON`). Never let Python write to the DB; that is Node's job exclusively.
- **Port**: Python service runs on `5050`, Node on `3001`, React on `5173`. No conflicts.
