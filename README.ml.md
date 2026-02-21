# 🧠 StatFoot ML Service — Setup & Launch Guide

The Python FastAPI ML service runs **independently** alongside the Node.js backend.
It handles all LightGBM model training, inference, and backtesting.

---

## Architecture

```
React (5173) ←→ Node.js (3001) ←→ Python FastAPI (5050)
                      ↕
              backend/database.sqlite (Node = writer, Python = reader)
```

---

## 🛠️ One-Time Setup

```bash
# 1. Navigate to the ml-service directory
cd ml-service

# 2. Create a Python virtual environment
python3 -m venv venv

# 3. Activate the virtual environment
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# 4. Install all dependencies
pip install -r requirements.txt

# 5. Copy and configure environment variables
cp .env.example .env
# Edit .env if your database.sqlite is in a non-default location
```

---

## 🚀 Running the Service (Every Dev Session)

```bash
# From the statFootV3/ml-service directory, with venv activated:
uvicorn main:app --port 5050 --reload
```

Or use the npm convenience script from the project root:

```bash
npm run ml:dev
```

The service will start at: **http://localhost:5050**

Interactive API docs: **http://localhost:5050/docs**

---

## 🏋️ Training Models

The database must have historical fixture data before training is useful.

```bash
# Activate venv first (if not already)
cd ml-service && source venv/bin/activate

# Train the 1X2 outcome model
python -m models.trainer --target 1x2

# Train the Over/Under 2.5 goals model
python -m models.trainer --target ou25

# Train both models in sequence
python -m models.trainer --target all
```

**Training time estimates:**
- Small dataset (< 5,000 fixtures): ~2–5 minutes
- Medium dataset (5,000–20,000 fixtures): ~10–20 minutes
- Large dataset (> 20,000 fixtures): ~30–60 minutes

Trained models are saved to `ml-service/saved_models/`:
```
saved_models/
├── 1x2_v1.pkl               ← Pickled model bundle
├── 1x2_v1_meta.json         ← Training metrics
├── feature_importance_v1_1x2.json
├── ou25_v1.pkl
└── ou25_v1_meta.json
```

---

## 📊 Backtesting

```bash
# Backtest Premier League (API league_id = internal ID in V3_Leagues)
python -m backtesting.engine --league 39 --from 2022-08-01

# Backtest multiple leagues
python -m backtesting.engine --league 39,140,78 --from 2022-08-01

# Backtest all leagues with historical data
python -m backtesting.engine --league all --from 2022-08-01

# Specify end date (default: today)
python -m backtesting.engine --league 39 --from 2022-08-01 --to 2025-12-31
```

---

## 🔌 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/health` | Liveness + model status check |
| `POST` | `/predict` | Predict outcome for a fixture |
| `POST` | `/train` | Trigger background retraining |
| `GET` | `/model/current?target=1x2` | Current model metadata |
| `POST` | `/backtest` | Run walk-forward backtest |
| `POST` | `/features/build` | Debug: inspect feature vector |

**Example /predict request:**
```json
{
  "fixture_id": 12345,
  "target": "1x2"
}
```

---

## 🛡️ Anti-Leakage Guarantee

Every SQL query in `features/builder.py` includes:
```sql
AND date < '{fixture_date}'
```
This ensures features for a match on date D only use data from matches
completed **strictly before** D. No future data bleeds into training or inference.

---

## 🔧 Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `../backend/database.sqlite` | Shared SQLite database path |
| `MODEL_DIR` | `./saved_models` | Where trained models are stored |
| `PORT` | `5050` | FastAPI server port |
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `MIN_TRAIN_SAMPLES` | `500` | Min fixtures required to train |
| `ELO_K_FACTOR` | `20` | ELO K-factor |
| `ELO_HOME_ADVANTAGE` | `100` | ELO home advantage points |

---

## ⚠️ Troubleshooting

**"Database not found"**
→ Make sure the Node.js backend has been started at least once so the database file exists.

**"No trained model found for '1x2'"**
→ Run `python -m models.trainer --target 1x2` first.

**"Not enough training samples: N < 500"**
→ Import more fixture data via the Node.js import hub before training.

**Port 5050 already in use**
→ `kill -9 $(lsof -t -i:5050)`
