# 👤 US_189: Sequential Walk-Forward Orchestrator
**Accountable Agent**: ML Architect / Backend Developer
**Feature Type**: Orchestration Logic
**Mission**: Build the "Forge" controller that manages the chronological loop of Prediction $\rightarrow$ Validation $\rightarrow$ Retraining.

---

## 🎯 Strategic Objective
The "Holy Grail" of ML deployment. Instead of one model used forever, this engine ensures the model is **constantly evolving**. It simulates a five-year period where the AI "takes a lesson" from every month it predicts.

## 📋 Technical Blueprint for Agents

### 1. The "Forge" Loop (The Master Orchestration)
The orchestrator must run the following logic in a loop:
1. **WINDOW**: Define the "Training Set" (e.g., all data from 2010 to current_month - 1).
2. **TRAIN**: Trigger `ml-service/training.py` using the current window.
3. **PREDICT**: Run **US_182 (Replay Engine)** for the *entire current month*.
4. **SETTLE**: Run **US_183 (Validation Matrix)** for that month.
5. **TELEMETRY**: Update the Dashboard with the month's accuracy.
6. **SLIDE**: Move `current_month` forward by 1.
7. **REPEAT**: Continue until the end of the simulation period.

### 2. State Management
- The orchestrator must handle **Model Snapshots**.
- It must allow "Resume" capability. If a 10-year forge run stops at Year 4, the user can resume from that exact date.

### 3. Drift Alerting
- If the Brier Score drops significantly for three consecutive months, the orchestrator must flag a "Model Drift Alert" to the UI.

## 🛠️ Technical Requirements
- **Integration**: High-level Node.js service calling the Python `ml-service` via REST or CLI.
- **Resource Management**: Automate the clearing of Python memory after every retraining cycle to prevent memory leaks during long simulations.

## ✅ Acceptance Criteria
- Orchestrator can successfully "Forge" a league from 2019 to 2024 without manual intervention.
- The UI reflects the "Training Phase" vs. "Prediction Phase" for every month.
- Total runtime for a 1-year forge (12 cycles) is under 15 minutes.
