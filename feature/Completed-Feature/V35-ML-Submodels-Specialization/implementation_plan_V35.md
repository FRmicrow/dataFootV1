# Implementation Plan: V35 - ML Submodels Specialization

Specializing the ML Hub to provide precise predictions for the Corners and Discipline (Cards) markets using dedicated feature adapters and a refined training pipeline.

## Proposed Changes

### [ml-service]

#### [MODIFY] [time_travel.py](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/time_travel.py)
- Implement `CornersAdapter`:
  - Calculate rolling corner averages (Home/Away, For/Against) for 3, 5, 10 matches.
  - Integrate xG momentum as a "pressure" weight.
- Implement `DisciplineAdapter`:
  - Calculate rolling averages for Yellow Cards, Red Cards, and Fouls.
  - Integrate "Pressure Index" (xG Against / Possession ratio).

#### [MODIFY] [train_forge.py](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/train_forge.py)
- Refactor to support multiple target labels in a single run.
- Add target definitions:
  - `target_corners`: Total corners (Over/Under threshold).
  - `target_cards`: Total cards (Over/Under threshold).
- Update model saving logic to produce `model_corners.joblib` and `model_cards.joblib`.

### [frontend]

#### [MODIFY] [MLLeaderboard.jsx](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/frontend/src/components/v3/modules/ml/submodules/MLLeaderboard.jsx)
- Add columns for **Corners Hit Rate** and **Cards Hit Rate**.

#### [NEW] Submodel Prediction View
- Update the Match Prediction module to display the specific results for Corners and Cards alongside the 1X2 prediction.

## Verification Plan

### Automated Tests
- `pytest ml-service/test_features.py`: Add unit tests for `CornersAdapter` and `DisciplineAdapter`.
- `python3 ml-service/train_forge.py --league 39 --targets corners,cards`: Verify model generation.

### Manual Verification
- Check the **ML Hub** to ensure submodel accuracy is displayed correctly.
- Verify match predictions in the **Studio** to see the new data points.
