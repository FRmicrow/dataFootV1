📂 Created User Stories (/UserStories/V9-Quant-Lab-Rebuild/)

Feature Name: Quant Lab Research & Model Governance Rebuild
Version: V9
Global Feature Type: Architecture Upgrade / ML Governance / UX Overhaul
Scope: Full Stack / Data / ML

---

US_210: Multi-Horizon Model Registry Schema
Feature Type: Architecture Upgrade
Role: Backend Developer / Data Engineer
Goal: Establish a structured registry to manage and version different model horizons (Full, 5Y, 3Y) per league.
Core Task: Refactor V3_Model_Registry and create V3_Quant_Ledger to support multi-horizon tracking and detailed performance snapshots.
Functional Requirements:
- Support 3 distinct horizon types: FULL_HISTORICAL, 5Y_ROLLING, 3Y_ROLLING.
- Track training dataset size and feature count for each model version.
- Ensure no model can be silently overwritten (Version tagging).
- Associate models with specific league_id (allow null for global models).
Technical Requirements:
- Database: SQLite.
- Tables: 
  - V3_Model_Registry (Updated): id, league_id, horizon_type, version_tag, hyperparameters_json, features_list_json, training_dataset_size, accuracy, log_loss, brier_score, trained_at, is_active.
  - V3_Quant_Ledger (New): Historical performance snapshots for each model/simulation run.
Acceptance Criteria:
- Migration script successfully creates/updates tables.
- Unique constraint on (league_id, horizon_type, version_tag) is enforced.
- Model registry allows retrieving the "Active" model for a specific league and horizon.

---

US_211: Multi-Horizon Model Training Orchestrator
Feature Type: New Capability
Role: ML Engineer / Backend Developer
Goal: Implement the logic to train and version the three mandatory model horizons per league.
Core Task: Modify the ML training pipeline to accept horizon parameters and enforce data windowing.
Functional Requirements:
- Implement data windowing:
  - FULL_HISTORICAL: All available historical data.
  - 5Y_ROLLING: Data from [CurrentDate - 5 Years] to [CurrentDate].
  - 3Y_ROLLING: Data from [CurrentDate - 3 Years] to [CurrentDate].
- Automated Registration: Every training run must create a record in V3_Model_Registry.
- Progress reporting: Output logs for each training step (Feature extraction -> Training -> Validation).
Technical Requirements:
- Language: Python (ML Service).
- Scripts: train_1x2.py, features.py.
- Parameters: --horizon (FULL_HISTORICAL | 5Y_ROLLING | 3Y_ROLLING).
Acceptance Criteria:
- Training "England - Premier League" with --horizon 3Y_ROLLING isolates exactly 3 years of data.
- Model is saved in a dedicated path and registered in DB with correct metrics.

---

US_212: Quant Model Matrix UI
Feature Type: UX Improvement
Role: Frontend Developer
Goal: Provide a high-density, analytical overview of the Quant state, mirroring the Import Matrix.
Core Task: Build the "Quant Model Matrix" page to visualize Core Data, Model Status, and Ledger Performance.
Functional Requirements:
- Rows: Imported Leagues.
- Columns: Horizontal Blocks (Core Data | Model Status | Quant Ledger).
- Core Data Block: Total matches, Seasons count, Data completeness %.
- Model Status Block: Separate indicators for Full, 5Y, and 3Y models (Version, Accuracy, Log-Loss).
- Quant Ledger Block: Total simulations, Correct winner %, Brier Score, exact score success rate (optional if data allowed).
- Global Control: "Rebuild All Quant Models" button.
Technical Requirements:
- Component: QuantModelMatrixPage.jsx.
- Styling: Deep institutional aesthetic, CSS Grid, Hover-state tooltips for detailed metrics.
Acceptance Criteria:
- Navigation includes the new Quant Lab Matrix.
- Real-time status indicators reflect the actual DB state of models and simulations.
- No ROI or odds-related metrics are displayed.

---

US_213: Sequential Quant Regeneration Worker
Feature Type: Architecture Upgrade
Role: Backend Developer / DevOps
Goal: Orchestrate the full rebuild cycle of the Quant module for all active leagues without overstressing system resources.
Core Task: Implement a background worker that sequentially rebuilds models, runs simulations, and settles ledgers 1-by-1.
Functional Requirements:
- Sequential Loop: For each league -> Training(Full) -> Training(5Y) -> Training(3Y) -> Simulation(all) -> Settle.
- No parallel processing (to preserve RAM).
- Real-time progress tracking in the UI (via Socket.io or SSE).
- Error handling: One league failure must not stop the entire batch.
- Explicit logging of every step.
Technical Requirements:
- Queue system to handle the sequential tasks.
- Progress storage in V3_Forge_Bulk_Jobs.
Acceptance Criteria:
- Clicking "Rebuild All" triggers the background process.
- UI displays a progress bar and active league/horizon being processed.
- Memory usage remains stable during the entire rebuild.

---

US_214: Forge Result Persistence & "Silent Failure" Resolution
Feature Type: Bug Fix / Architecture Upgrade
Role: Full Stack
Goal: Eliminate silent simulation failures and ensure every run settles identifiable results.
Core Task: Refactor the simulation storage and polling logic to ensure state transparency.
Functional Requirements:
- Explicit failure states: If simulation stops, status must be 'FAILED' with a reason.
- Storage logic: Pin simulation result to a specific Simulation_ID and Model_ID.
- Result settling: Ensure `summary_metrics_json` is fully populated before marking as 'COMPLETED'.
- UI Feedback: Show "No results yet" or "Failed" instead of defaulting to initial state.
Technical Requirements:
- backend/src/services/v3/SimulationQueueService.js updates.
- frontend/src/components/v3/live-bet/SimulationDashboard.jsx updates.
Acceptance Criteria:
- Simulation run results are saved in V3_Forge_Results and never lost.
- Refreshing the page during a simulation restores the progress state from DB (not just in-memory).

---

🔍 Audit & Assumptions
- Current system relies too heavily on in-memory state in `SimulationQueueService`, leading to data loss on restart.
- "Silent failures" are likely caused by Python unhandled exceptions or DB lock contention during concurrent writes.
- Data corruption/overwriting is occurring because versioning was previously missing from the model storage logic.
- Assumption: `v_market_settlements` view remains stable and is the source of truth for actual outcomes.
- Risk: Walk-forward retraining (US_189) might be extremely resource-intensive if run for all leagues simultaneously.

🎨 UX & Product Strategy
- This rebuild transforms the Lab from a "prediction tool" into a "Statistical Lab".
- The 3-horizon strategy allows for "Alpha Decay Analysis" (comparing old data vs new data effectiveness).
- Institutional design builds trust; the "Matrix" view allows immediate identification of "weak spots" in the model architecture.

🛠 Hand-off Instruction for the Team

BE AGENT:
1. Priority: Setup `V3_Model_Registry` with horizon support.
2. Implement Model settlement logic that persists results into `V3_Quant_Ledger`.
3. Refactor `SimulationQueueService` to be DB-driven (stateless) rather than memory-driven.

FE AGENT:
1. Prioritize `QuantModelMatrixPage.jsx`. Mirror the `ImportMatrix` logic but adapt for ML metrics.
2. Implement the "Global Rebuild" progress bar.
3. Fix the Simulation Dashboard state management to handle persistent simulation IDs.

DATA AGENT:
1. Write the migration for `V3_Model_Registry` and `V3_Quant_Ledger`.
2. Ensure `V3_Fixtures` has an index on `league_id, date` for fast windowing.
