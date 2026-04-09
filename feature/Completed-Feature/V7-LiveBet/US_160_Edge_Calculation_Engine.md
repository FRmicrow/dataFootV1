# User Story 160: Edge Calculation & Confidence Weighting

**Feature Type**: Architecture Upgrade
**Role**: Quant Analyst / Backend Developer
**Accountable**: Backend Agent

---

## Goal
Quantify the mathematical value of a bet by comparing the model's true probability against the market's implied probability.

## Core Task
Develop a "Value Detection" engine that calculates the statistical "Edge" and weights it by confidence.

## Functional Requirements
- **Edge Formula**: `Edge % = (Model Probability - Implied Probability) * 100`.
- **Confidence Scoring (0-100)**:
    - **Data Completeness**: +20 points if full Starting XI lineups are verified.
    - **Historical Accuracy**: +30 points if the model has a high Brier score for this specific league.
    - **Volatility Check**: -10 points if odds are drifting fast in the opposite direction.
- **Filtering**: Only flag "Value Bets" where `Edge > 3%` and `Confidence > 60%`.
- **Kelly Criterion Integration**: Suggest a theoretical "Staking Unit" based on the Edge (informational only).

## Technical Requirements
- **Implementation**: Implement in `backend/src/services/v3/quantService.js`.
- **Precision**: Use high-precision arithmetic for edge calculations to avoid rounding errors.
- **Reporting**: Store calculated edge in `V3_Predictions.edge_value`.

## Acceptance Criteria
- System identifies a "Value Bet" when the model significantly disagrees with bookies.
- Confidence score is transparently displayed in the Match Details.
- Edge calculations are recalculated instantly if odds are updated.
- A "High Edge + High Confidence" bet is highlighted with a unique visual indicator.
