# Technical Specification Document (TSD) - V34-MLhub-Improvement

## 1. Vision & Objectives
- **Goal**: Rework the ML Hub to leverage newly imported xG (Expected Goals) data.
- **Pillars**:
  - **Performance**: Improve Log-Loss/Brier Score by integrating predictive xG metrics.
  - **General to Specific**: Refine the global 1X2 model first, then apply improvements to specific submodels (Corners, Cards).
  - **Adaptability**: Design the pipeline to easily incorporate new data sources (like Over/Under) and multiple 1x2 providers.
  - **Transparency**: Update the Model Factory UI to show xG feature importance.

## 2. Data Contract

### Input Data (PostgreSQL)
- `V3_Fixtures.xg_home`: REAL
- `V3_Fixtures.xg_away`: REAL
- `V3_League_Season_xG`: Rolling averages for teams per season.

### Feature Definitions (TemporalFeatureFactory)
- `mom_xg_f_h5`: Exponentially weighted rolling average of xG For (Home).
- `mom_xg_a_h5`: Exponentially weighted rolling average of xG Against (Home).
- `xg_efficiency_h5`: Ratio of `Actual Goals / Expected Goals` over last 5 matches.
- *(Same for Away team with `_a5` suffix)*

## 3. Architecture Changes

### Feature Pipeline Architecture (`time_travel.py`)
- **Adapter Pattern**: Refactor `TemporalFeatureFactory` to use "Feature Blocks" (Momentum, LQI, ELO, xG). This allows adding "Over/Under" or "Market Data" blocks easily.
- **xG Block**: Add `_get_team_xg_momentum` method.
- Update `feature_columns` to integrate xG metrics.
- Enforce "Morning-Of" rule: xG for match `M` is only calculated using matches strictly before `date(M)`.

### ML Hub UI
- Minimal tweaks to display new feature importance labels (e.g., "xG Momentum") in the Leaderboard and Model Factory tabs.

## 4. Logic & Refinement Path
1. **General (Phase 1)**: Rework the `model_1x2` (Global and League-specific versions).
2. **Specific (Phase 2)**: Update Submodels:
   - **Corners**: xG (especially Non-Penalty xG) correlates strongly with pressure/corners.
   - **Cards**: High xG/Pressure often leads to high-intensity situations and more cards.

## 5. Edge Cases
- **Missing xG (New Leagues)**: Handle NULL values by defaulting to the league's mean xG or using a fallback to GD momentum.
- **Data Mismatch**: Ensure Understat mapping (from V32) is robust before calculating features.
