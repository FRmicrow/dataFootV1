# 👤 US_181: Time-Travel Feature Factory
**Accountable Agent**: ML Agent / Data Engineer
**Feature Type**: Core Intelligence / Data Pipeline
**Mission**: Implement a strict, leakage-proof feature extraction engine that "blindfolds" the model to the future during backtesting (The Forge).

---

## 🎯 Strategic Objective
Absolute scientific validity. If the model incorrectly "peeks" at the result of a match (or subsequent matches) during training, the accuracy metrics will be falsely inflated. This story builds the "Temporal Firewall."

## 📋 Technical Blueprint for ML Agent

### 1. The `as_of_date` Constraint
Every query executed by the ML engine must enforce a global filter:
`WHERE f.date < :target_date`
This ensures that "Form," "Recent Goals," and "ELO" are calculated only using matches that finished strictly *before* the match we are trying to predict.

### 2. Feature Algorithms (Sequential Logic)
- **Rolling Momentum (H/A)**:
    - Calculation: Mean Goal Difference and Points per Game for the individual team's last 5 and 10 matches *prior to the target match date*.
- **Lineup Strength Index (LQI)**:
    - Logic: Sum of ratings of the Starting XI from the *actual match lineups* (already in `V3_Fixture_Lineups`).
    - Note: This is preserved in `V3_Feature_Snapshots` for recent matches, but must be dynamically reconstructed for historical ones.
- **Dynamic H2H Context**:
    - Average outcome of the last 3 meetings *prior to the target match date*.
- **ELO Integration (US_188)**:
    - Retrieve the team's ELO score exactly as it was on the morning of the match day.

### 3. Implementation Plan
1. **Refactor `ml-service/time_travel.py`**:
    - Create a class `TemporalFeatureFactory`.
    - Function: `get_vector(fixture_id, target_date)`
2. **Data Source Priority**:
    - Priority 1: `V3_Feature_Snapshots` (Highest fidelity).
    - Priority 2: Standard SQL Aggregates (Fall-back for older historical data).
3. **Leakage Prevention Check**:
    - Implement a validation step that verifies the results of `target_date` matches are NOT used in the mean calculation of the input features.

## 🛠️ Technical Requirements
- **Language**: Python 3.11+.
- **Database**: SQLite (via `sqlite3` or `pandas.read_sql`).
- **Performance**: High-speed indexing on `V3_Fixtures(date)` to ensure sub-100ms vector generation.

## ✅ Acceptance Criteria
- **Zero Leakage**: Running the prediction for "PSG vs Marseille" on Sept 14, 2021, returns identical features today as it would have on Sept 13, 2021.
- **Dynamic Adaptability**: Features for "Matchday 2" are significantly different from "Matchday 35" as the model incorporates season-long performance.
- **Format**: Output must be a standardized `{feature_name: value}` dictionary ready for XGBoost inference.
