# US_033: Targeted Model Training (The "Base Foundation")

## 🎯 High-Level Objective
Protect the ML model from "garbage in" by limiting the training data to only high-quality, user-selected leagues (Premier League first). 

## 📋 Requirements
1. **Source Filtering**: The Trainer must accept a list of `league_ids`.
2. **Quality Check**: Before training, the system verifies that the selected leagues have enough "Empowered" data in the `Feature Store`.
3. **Foundation Lockdown**: Specifically implement the "Strong Base" goal—ensuring Premier League data is perfected and trained on first before expanding the model to other leagues.

## ✅ Acceptance Criteria (AC)
- [ ] User can trigger: *"Train 1X2 Model using ONLY {Premier League} data."*
- [ ] The trainer ignores data from all other leagues even if features exist in the Store.
- [ ] Metrics (Accuracy, Log Loss, ROI) on the "Betting Labs" page are flagged as *"Base: Premier League only"*.
- [ ] The model can be "Incrementally Empowered": adding a second league (e.g., Ligue 1) later without losing the intelligence gained from the Premier League base.

## 🛠️ Technical Implementation Notes
- **Python**: Modify `_load_completed_fixtures` in `trainer.py` to add a `WHERE league_id IN (...)` clause.
- **Node**: Store the "Current Training Base" in a configuration file so the app knows which model version corresponds to which league set.
