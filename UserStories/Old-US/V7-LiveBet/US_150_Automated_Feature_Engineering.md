# User Story 150: Automated Feature Engineering Pipeline

**Feature Type**: MLE / Data Engineering
**Role**: ML Engineer
**Accountable**: ML Agent

---

## Goal
Transform millions of raw statistics into a high-dimensional feature matrix optimized for predictive modeling.

## Core Task
Design and implement a `FeatureEngine` service that computes derived metrics for every team/match in the historical database.

## Functional Requirements
- **Team-Level Features**:
    - **Momentum Index**: Weighted rolling window of Goal Difference (GD) and xG (proxy) for last 5/10/20 matches.
    - **Defensive Resilience Score**: Inverse of goals conceded when leading vs trailing.
    - **Home/Away Differential**: Performance delta when playing away from home (Goals For/Against).
    - **Schedule Strength (SoS)**: Average rank/strength of opponents faced in the last 10 games.
- **Player-Level Weighting**:
    - **Lineup Quality Index (LQI)**: Total "Career Value" or "Recent Rating" of the Starting XI vs the Season Average.
    - **Availability Delta**: Impact score of missing Key Players (top 3 by minutes/goals).
- **Temporal Consistency**: Features must be calculated *as of* the match date to avoid data leakage.

## Technical Requirements
- **Pipeline**: Create a `ml-service/features.py` script.
- **Performance**: Use vectorization (NumPy/Pandas) to compute features for 100k+ matches in under 3 minutes.
- **Persistence**: Store pre-computed features in `V3_Feature_Snapshots` or a dedicated parquet/cache layer.

## Acceptance Criteria
- Feature matrix contains no null values for historical "Rank <= 10" matches.
- Lineup impact is correctly reflected as a numeric feature (-X to +X).
- Feature calculation logic is unit-tested for "leakage" (no future data used for past matches).
