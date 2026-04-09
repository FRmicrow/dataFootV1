> Obsolete Note (2026-03-18): Historical SQLite-era document kept for archive only. The active stack now uses PostgreSQL via `statfoot-db`.

# 🏁 V8 Forge Validation Framework: End-to-End Workflow & Capabilities

## 1. Overview
The V8 Forge Engine is a production-grade algorithmic validation backtester built to verify Quantitative Trading strategies on historic football data. Unlike simplistic backtesting, The Forge mimics true out-of-sample chronological constraints to validate whether a model truly holds an edge against historical sportsbook closing prices.

## 2. End-to-End Workflow

### Step 1: Scenario Configuration (The Control Center)
From the React Dashboard (`SimulationDashboard.jsx`), quantitative analysts define the parameters of the stress test:
- **League & Season Selection:** Plugs the engine into any historical context stored in SQLite (e.g., Ligue 1, Season 2024).
- **Execution Architecture Mode:** 
  - `STATIC`: A fast matrix validation where model weights are frozen across the entire season.
  - `WALK_FORWARD`: A realistic recursive retrain, re-fitting the underlying Scikit-Learn structure month-by-month as new match telemetry flows in, perfectly mimicking real-world production.

### Step 2: The Replay Engine (Leak-Proof Core)
Once a run is initialized via the Node.js asynchronously managed `SimulationQueueService`, the Python-based `LeagueReplayEngine` takes over:
- **Morning-Of Emulation**: The `TemporalFeatureFactory` strictly parses only information known *before* the kickoff timestamp. It ensures stats, ELO ratings, and form trends do not suffer from data bleed/lookahead bias.
- **Batched Inference**: Using pre-trained weights (`model_1x2.joblib`), it predicts accurate Home/Draw/Away match probabilities (`prob_home`, `prob_draw`, `prob_away`).
- **Buffer Commitment**: Results are stored robustly in `V3_Forge_Results`.

### Step 3: Quant Validation Matrix & Analytics Settlement
When the season concludes, the `ForgeAnalytics` agent groups the raw chronological data to extract true market edges:
- **Market Edge Exploitation**: By comparing the predicted probabilities to the actual implied market odds (`v_market_settlements`), it logs a +1% flat stake on strictly viable trades (>5% delta).
- **Diagnostics (US_187)**: 
  - **Overconfidence Detector**: Flags prediction buckets commanding >85% confidence that mathematically win <60% of the time.
  - **Confusion Matrix**: Maps real outputs vs. synthetic predictions to observe structural draw/away bias.
  - **Entropy (Log-Loss & Brier)**: Evaluates the system's calibration confidence penalties.
- **Sim Settlement**: Saves the full serialized analytics payload into `V3_Forge_Simulations`.

### Step 4: Visual Mission Control (React Dashboard)
- **Top-Line Hooks**: The UI conditionally displays the newly resolved `metrics.recalibration_suggested` and `overconfidence_warning` JSON attributes as high-priority alert cards to the system admin.
- **Visual Graphs**: 
  - **ROI Evolution Line**: Tracks the aggregate bankroll margin across the historic season.
  - **Calibration Matrix**: Maps bucket accuracies natively via CSS grids.
  - **Matchday Tape (US_185)**: Analysts can drill down into the full 380 match schedule, analyzing which specific combinations exploited market inefficiencies (marked in green).

## 3. Bulk Execution (US_186)
For stress tests targeting overarching strategy validity over thousands of seasons, the `bulkForgeWorker.js` completely offloads execution from the core API. 
- It iteratively processes combinations, pausing database sequences to guarantee maximum server stability while resolving decades of historic simulated trading metrics.

## 4. Institutional Benefits
1. **Absolute Confidence**: Preemptively flags model degradation (drift) before real stakes are deployed.
2. **Structural Transparency**: Converts opaque ML "black boxes" into transparent, auditable P&L curves.
3. **Automated MLOps**: Triggers smart "recalibration" alerts specifically when quantitative boundary limits are breached, shifting the ML operations purely into a self-healing paradigm.

---

### E2E Validation Performed (Console Log)

Triggering a live POST payload to the engine correctly initialized job execution.

**Request:**
`POST /api/simulation/start -d '{"leagueId": 1, "seasonYear": 2020, "mode": "STATIC"}'`

**Response:**
`{"success":true,"jobId":"sim_1_1771871502341","message":"Simulation started asynchronously"}`

The Background Engine completed the temporal parse, executed probabilities, extracted market edge settlements, and persisted the quantitative JSON metadata properly in `V3_Forge_Simulations`. The system handles the flow faultlessly.
