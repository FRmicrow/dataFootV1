# Implementation Plan - V34: ML Hub Rework & xG Integration

This plan outlines the technical steps to rework the ML Hub, incorporating newly imported xG data (fixture and player level) to improve match prediction performance.

## User Review Required

> [!IMPORTANT]
> This upgrade will modify the `TemporalFeatureFactory`, which is a core component. While it enforces the "Morning-Of" rule to prevent leakage, we should verify that historical xG is only used for PAST matches relative to the prediction target.

## Proposed Changes

### [Component] ML Service (Feature Engineering)

#### [MODIFY] [time_travel.py](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/time_travel.py)
- Update `feature_columns` to include:
    - `xg_for_3`, `xg_for_5`, `xg_for_10` (Rolling xG for)
    - `xg_aga_3`, `xg_aga_5`, `xg_aga_10` (Rolling xG against)
    - `xg_diff_5` (xG - Actual Goals efficiency)
- Implement `_get_team_xg_momentum()` helper to fetch and calculate these metrics.
- Ensure the "Morning-Of" rule is applied to all new xG lookups.

#### [MODIFY] [train_forge.py](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/ml-service/train_forge.py)
- Update training pipeline to automatically include the new xG features.
- Add a comparison log to show improvement in Log-Loss and Brier Score between baseline and xG-enhanced models.

### [Component] Documentation & Workflow

#### [NEW] [feature-spec.md](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/feature/V34-MLhub-Improvement/feature-spec.md)
- Draft the full TSD including Data Contract, UI Blueprint (if Hub UI needs tweaks), and Logic.

---

## Technical Specification (TSD) Draft

### 1. Data Contract
- **Source**: `V3_Fixtures.xg_home`, `V3_Fixtures.xg_away`
- **Source 2**: `V3_League_Season_xG` (for league-wide context)
- **Features**: 
  - `mom_xg_f_h5`: Avg xG for Home team in last 5 games.
  - `mom_xg_a_h5`: Avg xG against Home team in last 5 games.
  - `xg_efficiency_h5`: `(Actual Goals / xG)` ratio for Home team.

### 2. Logic & Edge Cases
- **Missing Data**: If xG is missing for a match (e.g., from a league not covered by Understat), use a regression-based estimate or the league average.
- **Normalization**: Clip ratios to [0.5, 2.0] to avoid outliers.

---

## Verification Plan

### Automated Tests
- **Feature Extraction Test**: `python3 ml-service/test_features_xg.py` (New script)
  - Verify that `get_vector` returns the expected xG features for a sample match.
  - Verify NO LEAKAGE: ensure `xg_home` of the target match is NOT in the feature vector.
- **Training Validation**: Run `python3 ml-service/train_forge.py --league 15 --horizon 3Y_ROLLING` 
  - Verify the model trains successfully and produces an importance report.

### Manual Verification
- **ML Hub Review**: Check the "Model Factory" in the UI to ensure the new model version is registered and shows "active" status.
- **Performance Audit**: Manually compare 5 predictions with and without xG to see if the probabilities feel "more informed".
