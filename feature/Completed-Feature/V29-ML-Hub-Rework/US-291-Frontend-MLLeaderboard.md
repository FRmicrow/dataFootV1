# US-291: ML Leaderboard (Accuracy Tracking)
**Role**: Frontend Engineer

## Description
Implement a league-by-league accuracy leaderboard to visualize which markets and competitions are most predictable.

## Acceptance Criteria
- [ ] Table displaying: League Name, Horizon (Full/5Y/3Y), Accuracy, Brier Score, and Log Loss.
- [ ] Data fetched from `GET /forge/models`.
- [ ] Sorting functionality enabled for all metric columns.
- [ ] "Model Status" indicator (Active/Inactive) displayed per row.

## Test Scenarios / Proofs
- **Data Proof**: Verify the leaderboard matches the data returned by the backend registry.
- **Sorting Proof**: Click "Accuracy" header and verify leagues are sorted from highest to lowest precision.
