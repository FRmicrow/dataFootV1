# Walkthrough: V35 - ML Submodels Specialization (Corners & Cards)

This feature specializes the ML Hub by adding dedicated models for the Corners and Disciplinary (Cards) markets.

## Summary of Changes

### 1. Specialized Feature Adapters
Implemented two new adapters in [time_travel.py](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/time_travel.py) that join with `V3_Fixture_Stats` to extract precise match data:
- **CornersAdapter**: Extracts rolling averages for corners earned (`For`) and conceded (`Against`) across 3, 5, and 10 games.
- **DisciplineAdapter**: Extracts rolling averages for yellow cards, red cards, and fouls.

### 2. Multi-Target Training Pipeline
Refactored [train_forge.py](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/train_forge.py) to support concurrent training of multiple models:
- **1X2 Model**: Standard result prediction (unchanged).
- **Corners Model**: Predicts Over/Under 9.5 corners.
- **Cards Model**: Predicts Over/Under 3.5 cards.
Each market produces its own `.joblib` model and importance report, and is registered independently in the `V3_Model_Registry`.

### 3. ML Leaderboard Enhancement
The [Intelligence Ranking](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/frontend/src/components/v3/modules/ml/submodules/MLLeaderboard.jsx) table now includes specialized columns:
- **Corners**: Accuracy of the corner submodel.
- **Cards**: Accuracy of the disciplinary submodel.

## Verification

### Automated Verification
- Verified the SQL join logic in `time_travel.py` to ensure correct extraction of corner and cards stats from the `V3_Fixture_Stats` table.
- Verified the `train_forge.py` refactor by checking the new argparse `--targets` parameter and the split logic for classification.

### Manual Verification
> [!IMPORTANT]
> To see the results in the UI, you must trigger a **Build Models** with the `--targets ALL` or equivalent UI triggers. Once trained, the leaderboard will display the accuracy for each market.

---
*Created by Antigravity (ML Submodels Specialization)*
