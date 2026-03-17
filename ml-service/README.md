# 🧠 StatFoot V3 - ML Service Documentation

This service provides a high-performance Machine Learning infrastructure for football match prediction. It is a Python-based FastAPI application that handles feature engineering, model training, and real-time inference.

---

## 🏗️ Architecture

- **Entry Point**: `main.py` (FastAPI)
- **Feature Store**: `features.py` (ETL logic to populate the pre-match feature vector store)
- **Model Training**: `train_1x2.py` (Random Forest Classifier for 1X2 outcomes)
- **Storage**: Models are saved as `.joblib` files; features are stored in the PostgreSQL `V3_ML_Feature_Store` table.

---

## 🛠️ Installation & Setup

### 1. Requirements
- Python 3.11+
- Virtual environment (venv)

### 2. Initial Setup
```bash
# Navigate to the ml-service directory
cd ml-service

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn joblib pandas scikit-learn numpy
```

---

## 🚀 Running the Service

The service can be launched directly via `uvicorn` or using the `main.py` script.

### Launching with Uvicorn (Recommended)
```bash
# From the project root
./ml-service/venv/bin/uvicorn ml-service.main:app --host 0.0.0.0 --port 8008 --reload
```

### Checking Status
Visit: `http://localhost:8008/health`
You should see:
```json
{
  "status": "online",
  "model_loaded": true,
  "version": "1.2.0-rf-1x2",
  "training": { "is_training": false, ... }
}
```

---

## 🔄 Management (Restart / Stop)

### Stopping the Service
Find the process ID (PID) and kill it:
```bash
# Find PID
ps aux | grep uvicorn

# Kill PID
kill <PID>
```

### Manual Restart
If you modify the Python code, uvicorn will auto-reload if the `--reload` flag is active. Otherwise, stop and start again as shown above.

---

## 🧠 Machine Learning Workflow

### 1. Feature Engineering (Manual Trigger)
If you want to refresh the features for all matches without using the API:
```bash
source venv/bin/activate
python ml-service/features.py
```

### 2. Model Training (Manual Trigger)
To retrain the model on the latest features:
```bash
source venv/bin/activate
python ml-service/train_1x2.py
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/health` | Service health and model status. |
| **POST** | `/predict` | Predict 1X2 probabilities for a single `fixture_id`. |
| **POST** | `/batch_predict` | Predict for a list of `fixture_ids`. |
| **POST** | `/train` | **Trigger Retraining**: Async pipeline (Features -> Train -> Reload). |
| **GET** | `/train/status` | Current progress of the training pipeline. |

### Example Prediction Request
`POST http://localhost:8008/predict`
```json
{
  "fixture_id": 12345
}
```

---

## ⚠️ Troubleshooting

- **Model not found**: Ensure `model_1x2.joblib` exists in the `ml-service` folder. If not, run a training cycle.
- **DB Connection Error**: Ensure `DATABASE_URL` points to the active PostgreSQL instance.
- **Port already in use**: If 8008 is taken, change the port in the launch command: `--port 8009`.
