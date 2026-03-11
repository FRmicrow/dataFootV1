# US-353: UI Integration for Submodel Predictions

**Role**: Full-Stack Engineer
**Objective**: Expose the new submodel predictions in the ML Hub UI for visibility and validation.

## Description
Update the ML Hub and Match details views to display predictions for Corners and Cards alongside the standard 1X2 result.

## Acceptance Criteria
- [ ] **Leaderboard Update**: Add `Corners Accuracy` and `Cards Accuracy` columns to [MLLeaderboard.jsx](file:///Users/domp6/Projet%20Dev/NinetyXI/dataFootV1/frontend/src/components/v3/modules/ml/submodules/MLLeaderboard.jsx).
- [ ] **Matching View**: Update prediction cards to show "Projected Corners" and "Card Risk Level" (Low/Medium/High).
- [ ] **Orchestrator**: Update the build progress to show status for all 3 models.

## Test Scenarios / Proof
- **Visual Check**: Open the ML Leaderboard and confirm the new columns are populated with data from the simulation engine.
- **Workflow Test**: Trigger a model build and verify that the UI reflects the assembly of 3 models.
