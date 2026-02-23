# User Story 151: Probabilistic 1X2 Outcome Modeling

**Feature Type**: ML Engineering
**Role**: ML Engineer
**Accountable**: ML Agent

---

## Goal
Develop a robust Machine Learning model that predicts the "True Probability" of Home/Draw/Away outcomes based on historical and real-time features.

## Core Task
Train, validate, and deploy a multi-classification model (e.g., XGBoost, LightGBM, or Neural Net) tailored for football outcomes.

## Functional Requirements
- **Output Layer**: Provide a 3-way probability distribution `[P_Home, P_Draw, P_Away]` summing to 1.0.
- **Model Inputs**: Integrate Momentum, LQI (Lineup Quality), and Historical H2H patterns.
- **Explainability**: Output "Feature Importance" for every prediction (e.g., "Home win probability increased by +15% due to away team missing their top scorer").
- **Confidence Thresholding**: Mark predictions as "Low Certainty" if model variance is high.

## Technical Requirements
- **Framework**: Use Scikit-learn or XGBoost within the existing `ml-service`.
- **Validation**: Use Rolling Window Validation (not K-Fold) to respect chronological order of matches.
- **Inference**: Latency must be < 500ms for a single match request.

## Acceptance Criteria
- Model shows better Log-loss than a simple Poisson-only baseline.
- Model correctly prioritizes recent "Lineup Change" features in its weighing.
- Predictions are generated for all tracked leagues within 1 minute of lineup announcement.
- Integration tests confirm the model handles "Draw" outcomes with realistic probability distributions.
