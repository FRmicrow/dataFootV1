# US-352: Multi-Target Training Pipeline Update

**Role**: Machine Learning Engineer
**Objective**: Enhance the training pipeline to support concurrent generation of specialized models (1X2, Corners, Cards).

## Description
Update `train_forge.py` to allow training multiple target labels in a single execution loop, saving independent model files for each market.

## Acceptance Criteria
- [ ] `train_forge.py` refactored to support a list of target variables.
- [ ] Target logic implemented for `total_corners` and `total_cards` (Over/Under thresholds).
- [ ] Models saved separately: `model_1x2.joblib`, `model_corners.joblib`, `model_cards.joblib`.
- [ ] Evaluation metrics (Accuracy, Log Loss) calculated and logged for each submodel.

## Test Scenarios / Proof
- **Build Execution**: Run `python3 ml-service/train_forge.py --league 39 --targets ALL` and verify that three discrete joblib files are generated.
- **Metric Verification**: Check that accuracy for corners and cards is reported independently from the 1X2 accuracy.
