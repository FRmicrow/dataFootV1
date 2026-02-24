# 👤 US_190: Quant Lab Telemetry Dashboard
**Accountable Agent**: Frontend Developer / UX Architect
**Feature Type**: High-Fidelity UI / Real-time Monitoring
**Mission**: Create a "Mission Control" interface that visualizes the sequential training and simulation progress in real-time.

---

## 🎯 Strategic Objective
Transform the model training process from a "black box" into a transparent, institutional-grade experience where the user can watch the model "learn" through decades of football history.

## 📋 Functional Requirements
- **Progressive Timeline**: A visual horizontal timeline showing the years (2010 -> 2025). The "playhead" moves as the Sequential Orchestrator processes each month.
- **Real-time Logs**: A dedicated terminal-style panel showing live logs (e.g., `[ML] Training Ligue 1 - Oct 2019... Complete. Accuracy: 64%`).
- **Live Metrics Window**:
    - **Dynamic Accuracy Chart**: Updates every time a month is finished.
    - **Calibration Pulse**: A gauge showing current model stability.
    - **Brier Score Trend**: A line chart showing the model getting smarter over time.
- **League Focus**: Display the current league/season being "Forge-trained".
- **Telemetry Breakdown**:
    - **Phase 1: Feature Extraction** (Progress bar)
    - **Phase 2: ELO Recalculation** (Progress bar)
    - **Phase 3: XGBoost Training** (Active pulse)
    - **Phase 4: Simulation & Validation** (Success/Failure ticks)

## 🛠️ Technical Requirements
- **Socket.io / Server-Sent Events (SSE)**: Essential for pushing training progress from the Python/Node services to the UI without polling.
- **Componentry**: `QuantForgeHub.jsx`, `TelemetryTimeline.jsx`, `LiveMetricPulse.jsx`.
- **Styling**: Cyberpunk-Institutional aesthetic. Deep blacks, glowing secondary colors (cyan/amber), glass cards.

## ✅ Acceptance Criteria
- User can trigger a "Sequential Training" and see the playhead move from 2010 to 2025.
- The UI reflects the sub-step being processed (e.g., "Retraining Month 4...").
- Accuracy charts update in real-time as simulation results for a month are settled.
- The dashboard remains responsive even during heavy inference.
