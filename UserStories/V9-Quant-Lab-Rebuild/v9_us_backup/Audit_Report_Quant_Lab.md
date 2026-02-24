# 🔍 Quant Lab Audit Report (Feb 2026)

## 1. Issue: Simulation "Silent Failure"

### Findings:
- **Stateless Polling**: The `SimulationQueueService` uses a Node `Map` to track active python processes. This map is transient. If the backend server restarts (common in dev/reload environments), the map is cleared.
- **Frontend Disconnect**: When the frontend polls for a `jobId` that is no longer in the map, the backend returns a `404 Not Found`. The frontend `SimulationDashboard.jsx` handles this 404 by clearing its own state and `localStorage`, returning to the "Awaiting Protocol Activation" screen.
- **Summary Metrics**: Even when a simulation completes successfully (e.g. ID 35), the UI may fail to render if there's a discrepancy between the expected JSON schema and the actual returned data. Audit of DB shows large, valid JSON in `summary_metrics_json`, confirming the Backend/ML logic is working, but the UI hand-off is fragile.

### Root Causes:
1. **Lack of Persistence**: Simulation metadata should live in the DB from start to finish, not just in memory.
2. **Brittle State Management**: UI should restore the simulation view from the database based on the last `league_id` and `season_year` if a job is "Active" in the DB, rather than relying solely on a fleeting `jobId`.

## 2. Issue: Data Integrity & Corruption

### Findings:
- **No Versioning**: Previously, models were being saved as `model_1x2_league_{id}.joblib`. Each training session simply overwrote the file. This makes performance comparisons impossible.
- **Ledger Inconsistency**: The table `V3_Backtest_Results` and `V3_Forge_Simulations` were loosely coupled. There was no single source of truth for "Current Model Health" across different time horizons.
- **Corrupted Ledger**: Multiple attempts to rebuild without a clean "Reset" flag led to duplicate simulation entries or results from different model versions being mixed in the same analytics view.

## 3. Recommended Remediation (Implemented in V9 Strategy)

1. **Refactor DB**: Update `V3_Model_Registry` to include `horizon_type` and enforce unique versioning.
2. **Stateless Jobs**: `SimulationQueueService` must query the `V3_Forge_Simulations` table to recover job status, rather than its internal `Map`.
3. **Quant Model Matrix**: Replace the current dashboard with a global matrix (visual mirror of Import Matrix) to provide a "Full System Health" view.
4. **Horizon-Aware Training**: Update Python Orchestrator to handle `--horizon` flags and apply strict date windowing.

---
*Signed,*
AI Product Owner
