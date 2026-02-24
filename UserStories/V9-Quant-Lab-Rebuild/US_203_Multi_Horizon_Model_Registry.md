📂 Created User Stories (/UserStories/V9-Quant-Lab-Rebuild/)

# US_203: Multi-Horizon Model Registry Schema
**Feature Type**: Architecture Upgrade
**Role**: Data Engineer / Backend Developer
**Goal**: Establish a structured registry to manage and version different model horizons (Full, 5Y, 3Y) per league, ensuring no model is silently overwritten.

## 🎯 Strategic Objective
Transform the model storage from a loose file-based system into a formal governance registry. This allows the system to compare "Old World" models (Full History) against "Modern Era" models (Last 3-5 Years) to detect structural league changes and alpha decay.

## 📋 Functional Requirements
- Support 3 distinct horizon types: `FULL_HISTORICAL`, `5Y_ROLLING`, `3Y_ROLLING`.
- Ensure a unique constraint on `(league_id, horizon_type, version_tag)` to prevent data corruption.
- Implement an `is_active` flag to designate the primary model for each horizon per league.
- Track metadata for every training run: `dataset_size`, `features_count`, and `trained_at` timestamp.

## 🛠 Technical Requirements
- **Database Table**: `V3_Model_Registry`
  - Columns: `id`, `league_id`, `horizon_type`, `version_tag`, `hyperparameters_json`, `features_list_json`, `training_dataset_size`, `accuracy`, `log_loss`, `brier_score`, `model_path`, `is_active`.
- **Table**: `V3_Quant_Ledger`
  - Purpose: Store historical performance snapshots (Brier Score, Accuracy) for every simulation run linked to a specific model version.
- Migration logic must handle renaming/moving any legacy `model_1x2.joblib` files to the new `models/` directory structure.

## ✅ Acceptance Criteria
- Migration script executes without error on the SQLite database.
- Attempting to save a model with an existing `version_tag` for the same league/horizon throws a clear database error.
- The `V3_Model_Registry` correctly reflects the active model for both Global (null league) and Specialized (league ID) contexts.

---

🔍 Audit & Assumptions
- Existing models are currently file-based and overwritable.
- Assumption: `league_id` can be NULL for "Universal" models.
- Risk: Migration must not break existing inference endpoints during the transition.

🛠 Hand-off Instruction for the Team
- **DATA AGENT**: Implement the SQLite schema changes and write the migration script to move existing models into the new structure.
- **BE AGENT**: Update the Model loading logic to query the registry instead of hardcoded file paths.
