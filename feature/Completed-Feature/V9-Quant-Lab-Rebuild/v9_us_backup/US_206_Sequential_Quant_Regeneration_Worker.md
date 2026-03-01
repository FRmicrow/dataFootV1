📂 Created User Stories (/UserStories/V9-Quant-Lab-Rebuild/)

# US_206: Sequential Quant Regeneration Orchestrator
**Feature Type**: Architecture Upgrade / Performance Optimization
**Role**: DevOps / Backend Developer
**Goal**: Implement a background worker that sequentially rebuilds models for all active leagues without overstressing system RAM.

## 🎯 Strategic Objective
Enable a "Single Click" solution to recalibrate the entire machine learning engine (all leagues, all horizons) while ensuring system stability on 1-by-1 resources.

## 📋 Functional Requirements
- **Sequential Execution**: Process 1 League at a time. Within each league, process 1 Horizon at a time.
- **Queue Logic**:
  - `Train(Full) -> Simulation -> Settle`
  - `Train(5Y) -> Simulation -> Settle`
  - `Train(3Y) -> Simulation -> Settle`
- **Real-time Progress**: Push telemetry to the UI (e.g. `[Quant] Rebuilding Premier League - 5Y Rolling (40%)...`).
- **Resilience**: A failure in one league (e.g., partial data) must be logged but should not stop the entire bulk worker.

## 🛠 Technical Requirements
- Update `backend/workers/bulkForgeWorker.js` or create `QuantRegenWorker.js`.
- Use `V3_Forge_Bulk_Jobs` table to track progress.
- Link to the `ForgeOrchestrator.py` via process spawn, passing context flags.

## ✅ Acceptance Criteria
- Clicking "Rebuild All" in the Matrix UI starts a sequential process.
- Monitor console shows one training process starting exactly after the previous one finishes.
- Memory usage (RSS) does not spike beyond 10% of baseline during the run.

---

🔍 Audit & Assumptions
- Concurrent training in the previous V8 worker caused memory leaks or DB lock contention.
- Assumption: Python subprocesses are cleaned up correctly after termination.

🛠 Hand-off Instruction for the Team
- **BE AGENT**: Implement the sequential lock in the bulk worker to ensure "1-by-1" execution parity.
- **ML AGENT**: Ensure ‘settle_simulation’ logic writes to the Ledger before the worker moves to the next league.
