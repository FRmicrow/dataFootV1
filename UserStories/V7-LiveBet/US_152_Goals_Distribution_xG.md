# User Story 152: Goals Distribution & xG Projection

**Feature Type**: ML Engineering
**Role**: ML Engineer
**Accountable**: ML Agent

---

## Goal
Predict the exact goal distribution and expected goal (xG) projections for each team to allow analysis of Over/Under and Scoreline markets.

## Core Task
Implement a distribution-based model (Poisson or Negative Binomial) that converts team strength features into specific goal probabilities.

## Functional Requirements
- **xG Projection**: Output a float `expected_goals` for both Home and Away teams.
- **Probability Matrix**: Generate a 2D matrix of exact score probabilities (e.g., probability of 2-1 is 12%).
- **Market Derivatives**: Auto-calculate probabilities for:
    - **Over 2.5 Goals**
    - **Both Teams to Score (BTTS)**
    - **Clean Sheet**
- **Form Impact**: Dynamically adjust xG based on recent scoring efficiency vs defensive resilience.

## Technical Requirements
- **Algorithm**: Use a bivariate Poisson distribution or a regression-based xG model.
- **Data Source**: Use `V3_Player_Stats` (Shots on Target, Big Chances) as primary training inputs.
- **API Response**: Include `score_probabilities` object in the prediction payload.

## Acceptance Criteria
- Model provides accurate O/U 2.5 probabilities compared to historical samples.
- xG projections align with match favorites (Home favorite should generally have higher xG).
- System handles "High Scoring leagues" vs "Low Scoring leagues" using league-specific bias modifiers.
