📂 Created User Stories (/UserStories/V9-Quant-Lab-Rebuild/)

# US_205: Quant Model Matrix UI
**Feature Type**: UX Overhaul / High-Density Analysis
**Role**: Frontend Developer
**Goal**: Provide a high-density, analytical overview of the Quant state, mirroring the structure of the Import Matrix.

## 🎯 Strategic Objective
Move away from "Single-League" views to a "Global Grid" that allows the Quant Team to identify at a glance which leagues represent the highest predictability (Elite Brier Scores) vs. those that are drifting (Poor Calibration).

## 📋 Functional Requirements
- **Standardized Grid Layout**:
  - **Rows**: All active/imported leagues.
  - **Column Block 1 (Data Status)**: Matches count, Seasons count, Integrity flag (C).
  - **Column Block 2 (Model Horizons)**: 3 sub-columns (F / 5 / 3).
    - Indicators: Green (Elite), Amber (Stable), Red (Missing/Needs retrain).
  - **Column Block 3 (Ledger Metrics)**: Display Average Brier Score and Winner % for the selected horizon.
- **Global Control**: "Rebuild All Quant Models" button (Triggers US_206).
- **Tooltips**: Hovering over a model indicator shows the version tag, training date, and accuracy metrics.

## 🛠 Technical Requirements
- **Component**: `QuantModelMatrixPage.jsx`.
- **Styling**: Cyberpunk-Institutional aesthetic. Deep blacks, glowing indicators, high contrast.
- **API**: Create `GET /api/v3/quant/matrix` which returns a nested JSON of leagues + model registry states.

## ✅ Acceptance Criteria
- User can navigate to the "Quant Matrix" and see a complete overview of all league models.
- Indicators reflect true "Health" (e.g., if a model hasn't been retrained in 6 months, it should show Amber).
- Clicking a league row expands to show the detailed "Simulation Dashboard" for that specific league.

---

🔍 Audit & Assumptions
- The "Simulation Dashboard" currently is too focused on a single run. The Matrix provides the necessary "Macro" view.
- Assumption: The frontend can handle 50+ rows of leagues with sparklines or tooltips without performance lag.

🛠 Hand-off Instruction for the Team
- **FE AGENT**: Build the `QuantModelMatrixPage` component. Use the `ImportMatrixPage` as a layout foundation for structural consistency.
