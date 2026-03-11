# US-290: ML Command Center Base & Routing
**Role**: Full-Stack Engineer

## Description
Set up the new ML Command Center shell and update the main application routing to use the reworked hub.

## Acceptance Criteria
- [ ] New container `MachineLearningHubV29.jsx` created.
- [ ] App routing updated: `/machine-learning/*` -> `MachineLearningHubV29`.
- [ ] Sidebar/Top-bar navigation implemented to toggle between Leaderboard, Test Lab, and Factory.
- [ ] Layout follows DesignSystemV3 (ds-container, ds-flex).

## Test Scenarios / Proofs
- **Navigation Proof**: Browse to `/machine-learning` and verify the new shell loads with an active "Dashboard" or "Home" state.
- **Routing Proof**: Clicking "Leaderboard" updates URL to `/machine-learning/leaderboard` and renders the correct placeholder.
