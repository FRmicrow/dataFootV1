# 🚀 V9 Execution Plan & Agent Handover

This document serves as the exact plan for engineering agents to rebuild the Quant Lab.

## 📁 Related Docs
- [V9 Rebuild Strategy](./V9_Quant_Lab_Rebuild_Strategy.md)
- [Quant Strategy Guide](./Quant_Strategy_Guide.md)
- [Audit Report](./Audit_Report_Quant_Lab.md)

---

## 🛠️ PHASE 1: Data & Backend (Data/Backend Agent)
**Objective**: Build the source of truth and stateless services.

1. **Task 1.1: Database Schema Completion**
   - Ensure `V3_Model_Registry` and `V3_Quant_Ledger` are correctly indexed.
   - Add `error_message` (TEXT) to `V3_Forge_Simulations`.

2. **Task 1.2: Stateless Simulation Service**
   - Modify `backend/src/services/v3/SimulationQueueService.js`.
   - On class instantiation, scan `V3_Forge_Simulations` for `RUNNING` or `PENDING` states and populate the internal `Map`. This ensures jobs "survive" a server restart.

3. **Task 1.3: Quant Matrix API**
   - Create `backend/src/controllers/v3/quantController.js`.
   - Implement `getQuantMatrixStatus` which returns a list of all leagues and their status indicators for the 3 horizons (Core Data Check, Model Built, Ledger Metrics).

---

## 🧠 PHASE 2: ML Pipeline Refactor (ML Agent)
**Objective**: Horizon-aware training and calibration-first settlement.

1. **Task 2.1: Multi-Horizon Training**
   - Refactor `ml-service/train_1x2.py` to implement the windowing logic for `--horizon` (Full, 5Y, 3Y).
   - Ensure the `model_path` includes the horizon tag and version.

2. **Task 2.2: Accuracy-First Settlement**
   - Refactor `ml-service/analytics.py`.
   - **DISABLE ODDS/ROI LOGIC**.
   - Ensure `Accuracy`, `Brier Score`, and `Log-Loss` are stored as the primary metrics in `summary_metrics_json`.

3. **Task 2.3: Sequential Bulk Rebuild**
   - Update `backend/workers/bulkForgeWorker.js`.
   - Enforce a serial execution loop (League A[Full, 5Y, 3Y] -> League B...). NO concurrent training.

---

## 🎨 PHASE 3: institutional UI (Frontend Agent)
**Objective**: High-density analytical oversight.

1. **Task 3.1: The Quant Model Matrix Page**
   - Create `frontend/src/components/v3/QuantModelMatrixPage.jsx`.
   - mirror the `ImportMatrixPage.jsx` layout but with the 3 blocks defined in the Strategy Guide.

2. **Task 3.2: Robust Simulation Dashboard**
   - Update `frontend/src/components/v3/live-bet/SimulationDashboard.jsx`.
   - Add a "Pre-check" on mount: Query the API to see if a simulation is already running for the selected league/year. If yes, automatically enter "Polling" mode instead of offering the "Initialize" button.

3. **Task 3.3: Telemetry Integration**
   - Connect the Matrix with the background job status to show "Trainingイング" or "Simulating" pulses across the grid in real-time.

---

## 🚨 NON-NEGOTIABLE RULES
- **No Overwrites**: Version every model.
- **No Parallellism**: 1-by-1 rebuilds only.
- **Accuracy over Alpha**: Delete all ROI mentions. We want prediction accuracy, not gambling metrics.
