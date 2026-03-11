# US-294: System Health & Global Metrics
**Role**: Frontend Engineer

## Description
Implement the top-level "Pulse" monitoring in the Command Center to show global ML performance and system status.

## Acceptance Criteria
- [ ] 4 Glassmorphism metric cards at the top: Python Service Status, Active Predictors, Coverage %, and Mean Precision.
- [ ] "Live Pulse" badge to indicate real-time connection to the ML service.
- [ ] Visual indicator (Red/Green) if the model engine is not loaded.

## Test Scenarios / Proofs
- **Offline Proof**: Stop the ML service (if possible) and verify the "Offline" alert appears in the Command Center.
- **Data Proof**: Aggregated "Mean Precision" matches the average of all active models in the registry.
