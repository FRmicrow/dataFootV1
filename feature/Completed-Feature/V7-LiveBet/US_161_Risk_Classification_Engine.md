# User Story 161: Risk Classification Engine

**Feature Type**: Logic Refactor
**Role**: Backend Developer
**Accountable**: Backend Agent

---

## Goal
Categorize every prediction and value bet into distinct risk profiles to help the user manage their exposure.

## Core Task
Build a classification logic that buckets bets into "Low-Risk", "Medium-Risk", and "Speculative" categories.

## Functional Requirements
- **Classification Criteria**:
    - **Low-Risk**: Model Probability > 65% AND Edge > 2% AND Confidence > 80%.
    - **Medium-Risk**: Edge > 5% AND Confidence 50-80%.
    - **Speculative/High-Risk**: Large Edge (> 10%) but Low Confidence OR High Odds (> 5.00).
- **Correlation Warning**: Flag bets where outcomes are highly correlated (e.g., betting on Home Win AND Home -1.5 Handicap).
- **Variance Penalty**: Automatically downgrade a bet's classification if the sample size for the league is < 20 matches.

## Technical Requirements
- **Logic**: Centralize risk bucketing in the `PredictionController`.
- **UI Metadata**: Ensure the API returns a `risk_level` enum string.

## Acceptance Criteria
- Every value bet has a clear risk label.
- The system correctly identifies "Draw" predictions as generally Higher Risk.
- "Low-Risk" bets show a higher win-rate in historical backtesting than other buckets.
