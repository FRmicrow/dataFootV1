📂 Created User Stories (/UserStories/V9-Quant-Lab-Rebuild/)

# US_204: Horizon-Aware Training Pipeline
**Feature Type**: New Capability / ML Logic
**Role**: ML Engineer
**Goal**: Implement the logic to train and version three mandatory model horizons per league using strict date windowing.

## 🎯 Strategic Objective
Enable "Strategic Backtesting" by allowing the system to observe how model performance differs when trained on different temporal windows (Full History vs. Recent Form).

## 📋 Functional Requirements
- Implement 3 windowing strategies:
  - **FULL_HISTORICAL**: Train on all matches from 2010 to current.
  - **5Y_ROLLING**: Filter `V3_ML_Feature_Store` for matches within the last 5 calendar years from the cutoff date.
  - **3Y_ROLLING**: Filter for matches within the last 3 calendar years.
- **ROI DEPRECATION**: Remove all ROI and odds-related logic from the training and evaluation scripts.
- **Metric Settlement**: For every training run, calculate and register:
  - **Accuracy** (1X2)
  - **Brier Score** (Probabilistic calibration)
  - **Log-Loss** (System entropy)

## 🛠 Technical Requirements
- Update `ml-service/train_1x2.py`:
  - Add `--horizon` flag.
  - Implement the `datetime` windowing logic.
  - Automatically register the result in `V3_Model_Registry` upon completion.
- Pathing: Save models as `models/model_{horizon}_{version}.joblib`.

## ✅ Acceptance Criteria
- Running `train_1x2.py --league 61 --horizon 3Y_ROLLING` correctly filters the training set to the last 3 years of fixtures.
- The model's Brier Score is correctly calculated and saved to the registry.
- No "Odds" or "ROI" logs appear in the ML console during training.

---

🔍 Audit & Assumptions
- Current training script `train_1x2.py` does not have date-range filtering.
- Assumption: `V3_Fixtures` table has an index on `date` for efficient windowing.
- Risk: Too little data in the 3Y window for smaller leagues may cause model instability (Min match count check required).

🛠 Hand-off Instruction for the Team
- **ML AGENT**: Refactor `train_1x2.py` and `features.py` to prioritize the 3-horizon strategy and enforce calibration-based evaluation (Brier/Log-Loss).
