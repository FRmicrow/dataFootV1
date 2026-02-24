📂 Created User Stories (/UserStories/V10-Forge-Optimization/)

Feature Name: Forge Control Center Optimization  
Version: V10  
Global Feature Type: UX Overhaul & UX Improvement  
Scope: Full Stack  

---

US_210: Forge UI Persistence & State Management  
Feature Type: UX Improvement  
Role: Frontend Developer  
Goal: Ensure the Forge Control Center maintains its state across page refreshes to prevent user frustration and repetitive selections.  

Core Task: Implement persistent storage (localStorage) for the critical selection state (League and Season) and ensure the UI restores this state on initialization.  

Functional Requirements:  
- On league selection, save `league_id` to `localStorage`.  
- On season selection, save `season_year` to `localStorage`.  
- On component mount, check `localStorage` for previous selections.  
- If values exist, automatically trigger the retrieval logic:  
  - Fetch league-specific models.  
  - Fetch available seasons.  
  - Initiate simulation readiness checks.  
- Ensure model build status polling survives refresh by checking backend status on mount.  

Technical Requirements:  
- Use `useEffect` with empty dependency array to initialize state from `localStorage`.  
- Sync `selectedLeague` and `selectedYear` with storage on any change.  
- Handle edge cases where `localStorage` might contain stale IDs of leagues that were deleted or are no longer available.  

Acceptance Criteria:  
- Refreshing the page with a league and season selected keeps the same league and season selected.  
- The Sidebar shows the correct "Models" status and "Simulation Parameters" based on the persisted state.  
- Model build progress monitor reappears if a build was in progress before refresh.  

---

US_211: Unified League Exploration & Selection  
Feature Type: UX Improvement  
Role: Frontend Developer  
Goal: Simplify the navigation by removing redundant "Select League" discovery buttons and unifying the selection process.  

Core Task: Refactor the header and sidebar to provide a single, logical entry point for league selection and discovery.  

Functional Requirements:  
- Remove the large "Select League" discovery button from the header (deemed "useless" by user).  
- Integrate the discovery feature ("🔭 Discover New Leagues") directly into the Sidebar League Target dropdown or as a small action button next to it.  
- Ensure that "Discovering" a league and "Selecting" an already imported league lead to the same functional state in the Control Center.  

Technical Requirements:  
- Update `SimulationDashboard.jsx` to remove `forge-discovery-btn`.  
- Add a "Discover & Sync New Leagues" option to the `select` element in `SimulationDashboard` or a companion button in the `param-group`.  

Acceptance Criteria:  
- No redundant "Select League" button in the header.  
- Clear, single way to select a league from the sidebar.  
- Discovery tool is still accessible but doesn't distract from the core simulation workflow.  

---

US_212: Automated Simulation Result Retrieval  
Feature Type: UX Improvement  
Role: Full Stack  
Goal: Improve the user experience by automatically displaying historical simulation results without requiring manual user interaction.  

Core Task: Modify the simulation retrieval logic to auto-load the latest completed simulation when a league/season/horizon scope is selected.  

Functional Requirements:  
- When a season and horizon are selected, immediately check for an existing completed simulation in `V3_Forge_Simulations`.  
- If a matching simulation exists, automatically populate the `metrics` state and display the "Results Canvas".  
- Remove the requirement for the user to click "View Previous Results" manually.  
- Maintain a subtle "Last ran: [Date]" indicator to inform the user of the data's age.  

Technical Requirements:  
- Frontend: Update `checkActiveJob` or create a new dedicated retrieval function that sets `metrics` if status is `COMPLETED`.  
- Backend: Ensure `checkJobStatus` returns the latest `summary_metrics_json` for the given scope.  

Acceptance Criteria:  
- Selecting a season that was already simulated immediately shows the Accuracy charts and metrics.  
- No "Initial State" screen (Awaiting Protocol Activation) is shown if historical data is available.  

---

US_213: Robust Forge Process Heartbeat & Monitoring  
Feature Type: Architecture Upgrade / Bug Fix  
Role: Backend Developer / ML Engine  
Goal: Fix the "infinite loading" bug by implementing a robust monitoring system for background simulation processes.  

Core Task: Implement a heartbeat mechanism in the Forge Orchestrator and a watchdog in the Backend to detect and report hanging processes.  

Functional Requirements:  
- The `forge_orchestrator.py` must update a `last_heartbeat` timestamp in the `V3_Forge_Simulations` table every 30 seconds.  
- The Backend `SimulationQueueService` must scan for jobs that are `RUNNING` but haven't pulsed a heartbeat in over 2 minutes.  
- Automatically mark dead/hanging jobs as `FAILED` with specific error codes (e.g., `TIMEOUT_CRASH`).  

Technical Requirements:  
- Database: Add `last_heartbeat` column to `V3_Forge_Simulations`.  
- Backend: Implement a `setInterval` or cron-like task in `SimulationQueueService` to clean up orphaned jobs.  
- Python: Ensure the main loop in `forge_orchestrator.py` updates the heartbeat.  

Acceptance Criteria:  
- A simulation that crashes or hangs no longer shows "Infinite Loading" on the frontend.  
- The frontend receives a `FAILED` status and displays a "Simulation Time-out" error after a short period.  

---

US_214: Forge Error Transparency & Feedback  
Feature Type: Bug Fix / UX Improvement  
Role: Full Stack  
Goal: Provide the user with clear information about simulation status, current stage, and specific errors to eliminate "blind" loading.  

Core Task: Enhance the progress reporting from the ML Engine to the Frontend, including granular stage information and detailed error messages.  

Functional Requirements:  
- Progress Monitor must show the current stage: "Fetching Data", "Engineering Features", "Running Predictions", "Calibrating Metrics".  
- If a simulation fails, capture the SPECIFIC Python stack trace or error message (e.g., "Insufficient Data for 2024", "Model Registry Missing") and display it clearly on the frontend.  
- Add a "Retry" button on failed simulation cards.  

Technical Requirements:  
- ML Engine: Wrap core simulation blocks in try/except and write the specific error message to the `error_log` field in the database.  
- Frontend: Display `jobStatus.error` or `jobStatus.current_stage` in the `sim-progress-monitor`.  

Acceptance Criteria:  
- User can see exactly what the simulation is doing at any moment.  
- Errors are explicit and actionable (e.g., "Missing models for Eredivisie").  

---

US_215: Premium Forge Visual Aesthetics  
Feature Type: UX Improvement  
Role: Frontend Developer  
Goal: elevate the Forge Control Center UI to "Premium" standards with modern design patterns and smooth transitions.  

Core Task: Refactor the visual components to use a curated color palette, glassmorphism, and micro-animations.  

Functional Requirements:  
- Implement smooth CSS transitions for the "Param Card" expansion and "Results Canvas" appearance.  
- Use a glassmorphic style for the progress monitor and metrics banners.  
- Add subtle loading animations (skelton screens) for charts while data is being fetched.  
- Improve the "Trident Health" badges with pulsing glow effects when "Ready".  

Technical Requirements:  
- Use CSS Variables for a consistent, premium dark-mode palette.  
- Implement `framer-motion` (if available) or standard CSS `@keyframes` for animations.  

Acceptance Criteria:  
- The UI feels "alive" and responsive.  
- Visual feedback is immediate and high-quality.  

---

🔍 Audit & Assumptions

Current system limitations identified:
- The `SimulationQueueService` is currently a thin wrapper that spawns processes without deep state tracking, leading to orphaned "ghost" processes on server restart.
- Model retrieval logic relies on global `is_active` flags which might be inconsistent across leagues if not handled carefully during bulk builds.
- Frontend state is volatile, leading to a "blank slate" experience every time the user navigates away or refreshes.

Technical debt detected:
- The separation between "Imported Leagues" (dropdown) and "Discoverable Leagues" (Discovery UI) is confusing for users who only want to simulate what they already have.
- Error handling in `forge_orchestrator.py` is not currently feeding back detailed logs to the `V3_Forge_Simulations` table correctly.

Assumptions:
- The ML Service is running on a stable port (8000) and can handle background tasks without blocking main API requests.
- The `V3_Forge_Simulations` and `V3_Model_Registry` tables have the necessary columns or can be easily migrated to include `last_heartbeat` and `error_log`.

Risks:
- Auto-loading previous results might increase initial load time if the metrics JSON payload is massive (though currently it seems small enough).
- Heartbeat implementation requires shared access to the DB between the Python process and the Node process.

---

🎨 UX & Product Strategy

Why this feature improves the product:
- **Trust & Reliability**: By eliminating the "infinite loading" and showing clear stages, users feel the engine is working and reliable.
- **Efficiency**: Persistence and auto-loading turn a 4-click process (Select League -> Select Season -> Select Horizon -> View Results) into a 0-click or 1-click process for recurring analysis.
- **Professionalism**: Premium aesthetics and smooth transitions transform the tool from a "developer's experiment" into a "quant analysis workstation".

How it strengthens data integrity:
- Better monitoring ensures that failed simulations are correctly flagged, preventing users from making decisions based on "stale" or "incorrectly converged" models.

Long-term architectural value:
- The heartbeat mechanism is a foundational piece for V10’s focus on robust, stateless job orchestration, which will be critical when moving to multi-worker or cloud-based simulation environments.

---

🛠 Hand-off Instruction for the Team

ATTENTION AGENTS:

BE AGENT:
- Add `last_heartbeat` (DATETIME) and `error_log` (TEXT) to `V3_Forge_Simulations`.
- Implement the "watchdog" logic in `SimulationQueueService` to mark jobs as FAILED if they timeout.
- Ensure `getJobStatus` returns the full metrics object for auto-loading.

FE AGENT:
- Implement `localStorage` persistence for `selectedLeague` and `selectedSeason`.
- Remove the header "Select League" button and unify discovery into the sidebar.
- Implement auto-triggering of `fetchLeagueModels` and simulation retrieval on mount/selection.
- Polish UI with transitions and health-badge animations.

ML AGENT:
- Update `forge_orchestrator.py` to pulse the `last_heartbeat` and catch errors for the `error_log`.
- Report granular stages (Fetching, Engineering, Preds, Calibration) to the DB via PROGRESS updates or a new `stage` column.
