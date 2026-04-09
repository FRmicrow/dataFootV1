# US-293: ML Model Factory (League Building)
**Role**: Frontend Engineer

## Description
Refactor the model training interface into a "Factory" where users can trigger and monitor model builds for specific leagues.

## Acceptance Criteria
- [ ] Dropdown to select League and Season.
- [ ] "Build Models" button triggers `POST /forge/build-models`.
- [ ] Real-time progress bar/status trackers for the 3 horizons (FULL, 5Y, 3Y).
- [ ] Cancel build functionality via `POST /forge/cancel-build`.

## Test Scenarios / Proofs
- **Build Start Proof**: Trigger a build and verify the status switches to "Building" with visible progress indicators.
- **Cancellation Proof**: Click "Cancel" and verify the backend stops the process and updates UI to "Cancelled".
