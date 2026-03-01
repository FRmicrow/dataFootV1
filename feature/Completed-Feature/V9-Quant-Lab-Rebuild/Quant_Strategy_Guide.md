# 🧠 Quant Lab Model Strategy Guide

This document defines the mandatory modeling strategy for StatFoot V3. All agents (Backend, ML, Data) must adhere to these definitions to ensure statistical governance and comparability.

## 1. Mandatory Model Horizons

For every league, the system must maintain and validate **three distinct model horizons**. This is non-negotiable and core to our Quant Research Lab.

| Horizon Type | Data Window | Purpose |
| :--- | :--- | :--- |
| **FULL_HISTORICAL** | All available matches (2010 - Present) | Capture long-term structural trends and team "DNA". |
| **5Y_ROLLING** | Last 5 calendar years | Balance between historical depth and modern tactical shifts. |
| **3Y_ROLLING** | Last 3 calendar years | High-recency model. Detects rapid league changes or "Power Shift" eras. |

## 2. Model Versioning & Registry

- **Zero Overwrite Rule**: No model file should ever be overwritten. Every training run generates a unique `version_tag`.
- **Registry Record**: Every model must be registered in `V3_Model_Registry` with its training metrics (Accuracy, Log Loss, Brier).
- **Active Flag**: Only one model per (League, Horizon) can be `is_active = 1`.

## 3. Backtesting & Ledger Logic

Every model must undergo a **Full Season Replay** (Backtesting) before being considered valid. The results must be stored in the `V3_Quant_Ledger`.

### Primary KPIs (Success Indicators):
- **Accuracy**: Percentage of correct match winner predictions (1X2).
- **Brier Score**: Probabilistic calibration (the lower, the better). Measures predictability.
- **Log-Loss**: Uncertainty entropy. Penalizes high-confidence failures.
- **ROI Calculation**: DISABLED. Focus is purely on statistical accuracy and model calibration across horizons.

## 4. Logical Flow (The "Quant Loop")

1. **Feature Extraction**: Ensure all features for the requested horizon are present.
2. **Horizon Filtering**: Slice the `V3_ML_Feature_Store` according to the time window (Full, 5Y, or 3Y).
3. **Training**: Execute Random Forest / XGBoost logic sequentially.
4. **Validation**: Run internal cross-validation.
5. **Forge Simulation**: Perform a sequential walk-forward replay of the *entire current season* using the new model weights.
6. **Ledger Settlement**: Calculate and save final Accuracy, Brier, and Log-Loss stats.
7. **Matrix Update**: Refresh the `Quant Model Matrix` UI with updated markers.

## 5. Sequential Processing Mandate

To preserve system RAM and ensure stability, all model builds and simulations must run **sequentially (1-by-1)**. Parallel or concurrent training of horizons or leagues is strictly prohibited within the bulk rebuild worker.

- **Silent failure is forbidden.**
- If data is insufficient for a horizon (e.g. less than 50 matches), the error must be logged and the UI must show "INS_DATA".
- Any exception in Python must result in a `FAILED` status in `V3_Forge_Simulations`.

---
*Signed,*
AI Product Owner & Quant Strategist
