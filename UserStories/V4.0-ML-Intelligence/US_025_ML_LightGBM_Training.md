# US_025 - [ML/Python] LightGBM Training Pipeline & Model Versioning

## Title
[ML/Python] Train LightGBM Classifier with Calibration and Version Control

## User Story
**As a** ML Engineer  
**I want** to train, calibrate, and save versioned LightGBM models for 1X2 outcome prediction and O/U 2.5  
**So that** the system can generate accurate match probabilities that improve over time as more data accumulates.

## Acceptance Criteria

### AC 1: Two Separate Models (Targets)
Train **two independent models**, each stored separately:

| Model | Target Variable | Classes | File |
|-------|----------------|---------|------|
| `model_1x2` | Match Winner | `HOME`, `DRAW`, `AWAY` | `saved_models/1x2_vN.pkl` |
| `model_ou25` | Over/Under 2.5 Goals | `OVER`, `UNDER` | `saved_models/ou25_vN.pkl` |

*Why separate? The features that predict goals differ from features that predict the winner.*

### AC 2: Training Data Preparation
- **Given** the feature matrix (from US_024)
- **When** preparing training data
- **Then** filter only matches where `status_short IN ('FT', 'AET', 'PEN')` AND `goals_home IS NOT NULL`.
- **And** apply strict chronological ordering: `ORDER BY date ASC`.
- **And** split: last **20% of data by date** = test set. No random shuffle.
- **Target for 1X2**:
  ```python
  if goals_home > goals_away: label = 'HOME'
  elif goals_home < goals_away: label = 'AWAY'
  else: label = 'DRAW'
  ```
- **Target for O/U 2.5**: `OVER` if `(goals_home + goals_away) > 2.5` else `UNDER`.

### AC 3: LightGBM Model Configuration
```python
lgb_params = {
    'objective': 'multiclass',    # For 1X2
    'num_class': 3,
    'metric': 'multi_logloss',
    'learning_rate': 0.05,
    'num_leaves': 31,
    'min_child_samples': 20,
    'n_estimators': 500,
    'early_stopping_rounds': 50,
    'verbosity': -1
}
```
For O/U 2.5 model: `objective = 'binary'`, `metric = 'binary_logloss'`.

### AC 4: Probability Calibration
- **Given** raw LightGBM probabilities
- **Then** apply `CalibratedClassifierCV(lgb_model, cv='prefit', method='isotonic')`.
- **And** fit the calibrator on **validation data only** (not training data).
- **And** compare Brier Score before and after calibration to confirm it improves.
- **Save** both the raw model AND the calibrated wrapper.

### AC 5: Model Versioning (SQLite + Files)
- **Given** a completed training run
- **Then** save:
  - `saved_models/1x2_v{N}.pkl` — pickled calibrated pipeline
  - `saved_models/1x2_v{N}_meta.json`:
    ```json
    {
      "version": 12,
      "created_at": "2026-02-21",
      "target": "1x2",
      "log_loss_train": 0.891,
      "log_loss_test": 0.934,
      "brier_score": 0.212,
      "accuracy": 0.512,
      "train_samples": 8420,
      "test_samples": 2100,
      "feature_count": 35,
      "leagues_included": [39, 140, 78, 135, 61],
      "training_window_start": "2022-08-01",
      "training_window_end": "2026-02-01"
    }
    ```
  - Insert into `V3_ML_Models` SQLite table (Node creates this via migration):
    ```sql
    CREATE TABLE V3_ML_Models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_type TEXT,        -- '1x2' or 'ou25'
      version INTEGER,
      file_path TEXT,
      log_loss REAL,
      brier_score REAL,
      accuracy REAL,
      roi_backtest REAL,      -- filled after backtesting
      is_active BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    ```
- **And** promote new model to `is_active = 1` only if `log_loss < previous_active_model.log_loss`.

### AC 6: Manual Training Trigger (CLI)
```bash
# Retrain 1X2 model
cd ml-service && python -m models.trainer --target 1x2

# Retrain O/U model
cd ml-service && python -m models.trainer --target ou25

# Retrain both
cd ml-service && python -m models.trainer --target all
```
**Previous training data is never deleted.** Each run creates a new version, keeping the full history.

## Technical Notes
- **Class Imbalance for DRAW**: Draws are ~27% of outcomes. Use `class_weight='balanced'` in calibrator or LightGBM's `class_weight` param.
- **Minimum data threshold**: Do not train if `< 500 samples` (raise a warning and exit).
- **Feature importance**: After each training run, generate and save a `feature_importance_vN.json` to understand which variables matter most.
