# US_180: Simulation Schema & Model Registry

## Mission
Establish the data foundation for historical simulations and model performance tracking. This includes a registry for ML models and a structured storage for inference results.

## Technical Plan

### 1. Database Schema
Create/Update the following tables:

#### `V3_ML_Models` (The Registry)
- `model_id` (PK)
- `name` (e.g., '1X2_XGBoost_v1')
- `version` (e.g., '1.0.4')
- `target` (e.g., 'match_winner')
- `features_hash` (To track feature set consistency)
- `metrics_json` (Training metrics like Log-loss, Accuracy)
- `path` (Local path to weights)
- `is_active` (Boolean)
- `created_at`

#### `V3_Predictions` (Inference Storage)
- `prediction_id` (PK)
- `fixture_id` (FK)
- `model_id` (FK)
- `prob_home` (REAL)
- `prob_draw` (REAL)
- `prob_away` (REAL)
- `raw_data_json` (Full inference output)
- `timestamp`

#### `V3_Simulations` (Updated)
- Ensure it links to `model_id` or `strategy_id`.
- Track `kelly_criterion` if applicable.

## Success Criteria
- [ ] Model registry table exists and is populated during training.
- [ ] Predictions table can store historical inference results without duplication.
- [ ] Schema supports "as-of" date queries.
