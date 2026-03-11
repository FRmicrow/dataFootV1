# US-292: ML Test Lab (Fixture Live Testing)
**Role**: Frontend Engineer

## Description
Create an interactive "Predictive Laboratory" where the user can run model predictions against a specific fixture ID.

## Acceptance Criteria
- [ ] Search input for Fixture ID.
- [ ] "Run Prediction" button triggers `GET /predict/fixture/{id}`.
- [ ] Display card showing: Home/Draw/Away probabilities, Top Features influencing the result, and API latency.
- [ ] Error state handled if Fixture ID is invalid or features are missing.

## Test Scenarios / Proofs
- **Live Run Proof**: Input ID `123`, click run, observe the circular chart or percentage bars updating with backend data.
- **Empty State Proof**: Clear input and verify the lab shows an "Awaiting Input" state.
