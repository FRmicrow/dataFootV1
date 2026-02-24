# 👤 US_182: League Replay Engine
**Accountable Agent**: Backend Developer / ML Agent
**Feature Type**: Core Execution Logic
**Mission**: Build the "Simulation Tape" player that can chronologically iterate through a league season and generate model inferences for every matchday.

---

## 🎯 Strategic Objective
Create the execution framework for the "Sequential Forge." This engine must perfectly replicate the experience of "living through" a season, match by match, without ever knowing future results.

## 📋 Technical Blueprint for Agents

### 1. Chronological Replay Logic
- **Input**: `league_id`, `season_year`.
- **Process**:
    1. Fetch all finished matches for that league/season ordered by `date ASC`.
    2. For each match $X$:
        - Execute **US_181 (Time-Travel Fetcher)** to get the "as-of-date" feature vector.
        - Send vector to the current ML Model.
        - Capture probabilities (`prob_home`, `prob_draw`, `prob_away`).
        - Capture the "Edge" (Diff vs. Market Odds if available in `V3_Odds`).
    3. **Batch Settlement**: Every 10 matches (approx one matchday), save results to the new `V3_Forge_Results` table.

### 2. The Simulation Session (V3_Forge_Simulations)
- Every "Replay" must be linked to a `simulation_id` in the Forge Ledger.
- The engine must update the `status` (PENDING -> RUNNING -> COMPLETED) and the `current_month` progress live.

### 3. Integration with Telemetry (US_190)
- The engine must "Emit" a progress event after every matchday is processed.
- Event payload: `{ "simulation_id": ID, "current_matchday": N, "current_accuracy": % }`.

## 🛠️ Technical Requirements
- **Integration**: Python engine in `ml-service/simulation_engine.py`.
- **Data Flow**: 
    - Source: `V3_Fixtures` + `V3_Odds`.
    - Engine: `TemporalFeatureFactory` (Python).
    - Sink: `V3_Forge_Results`.
- **Parallelism**: Processing matches *within the same day* can be parallelized, but you MUST process matchdays sequentially.

## ✅ Acceptance Criteria
- Running a replay for the Premier League 2023 season generates 380 rows in `V3_Forge_Results`.
- All results generated are correctly linked to the specific `model_id` used for inference.
- The `V3_Forge_Simulations` table correctly reflects the "RUNNING" state during the process.
- Zero "Future Leakage" confirmed: The model never knows the score of Match X before it predicts Match X.
