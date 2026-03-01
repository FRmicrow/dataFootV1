📂 Created User Stories (/UserStories/V9-Quant-Lab-Rebuild/)

# US_207: Forge Stateless Job Persistence
**Feature Type**: Bug Fix / Stability
**Role**: Full Stack Developer
**Goal**: Eliminate the "Silent Failure" reset by moving job state management from memory to the database, allowing recovery after server restarts.

## 🎯 Strategic Objective
Ensure that "Mission Control" (The Quant Lab) is resilient to infrastructure hiccups or dev-environment reloads. If a long-running simulation is at 80%, a server restart should not "lose" that progress.

## 📋 Functional Requirements
- **Stateless Recovery**: On backend startup, `SimulationQueueService` must query the `V3_Forge_Simulations` table for any jobs with status `RUNNING` or `PENDING`.
- **UI Persistence**: If the user refreshes the page while a simulation is active, the UI must fetch the current status from the DB instead of resetting to the "Select Protocol" view.
- **Settlement Assurance**: Every simulation must settle its results into `V3_Forge_Results`. If the process is killed, the UI must show a "FAILED - RESTART REQUIRED" indicator instead of drifting.

## 🛠 Technical Requirements
- Refactor `backend/src/services/v3/SimulationQueueService.js` to eliminate the transient `this.jobs` Map in favor of direct DB queries.
- Update `frontend/src/components/v3/live-bet/SimulationDashboard.jsx`:
  - `useEffect()` on mount to check for "Active" jobs for the current league/year selection.

## ✅ Acceptance Criteria
- Trigger a simulation -> Kill the backend process -> Restart backend -> Refresh UI.
- The UI must show "Simulation in Progress" (or "Failed") with the correct progress %, not the initial selection screen.
- Log files show the service successfully "Re-adopting" existing worker jobs on startup.

---

🔍 Audit & Assumptions
- "Silent Failures" were identified as the biggest trust-killer in the Audit Report.
- Assumption: The `V3_Forge_Simulations` table contains sufficient metadata (id, progress, status) to reconstruct the UI state.

🛠 Hand-off Instruction for the Team
- **BE AGENT**: Move job tracking to the DB. Ensure `status` and `progress` columns are updated at every 10% increment.
- **FE AGENT**: Implement the mount-time health check in the Simulation Dashboard.
