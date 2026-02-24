# User Story 171: Calibration Audit & Brier Score Tracking

**Feature Type**: Governance / MLE
**Role**: ML Engineer
**Accountable**: ML Agent

---

## Goal
Monitor the statistical "Calibration" of the model (does 70% probability actually mean 70% win rate?) and detect performance drift.

## Core Task
Develop a calibration monitoring tool that calculates the **Brier Score** and **Log Loss** for all past predictions.

## Functional Requirements
- **Brier Score Calculation**: Calculate the mean squared difference between predicted probability and actual outcome.
- **Calibration Curve**: Generate data for a calibration plot (Predicted vs Observed frequency).
- **Drift Detection**: Alert the user if the model's Brier score for a specific league deviates by more than 15% from the global baseline.
- **Auto-Retrain Trigger (Monitoring)**: Flag models for retraining if calibration is "poor" (over-confident or under-confident).

## Technical Requirements
- **Automation**: Run calibration audit every 24 hours after fixtures are settled.
- **Reporting**: Display "Model Health" in the Intelligence Hub.
- **Metrics Storage**: Save metrics to a `V3_Model_Performance` log table.

## Acceptance Criteria
- System provides a Brier Score for every active model.
- Calibration curve accurately reflects if the model is biased toward favorites or underdogs.
- Admin view shows a list of "Leagues needing retraining" due to low accuracy.
