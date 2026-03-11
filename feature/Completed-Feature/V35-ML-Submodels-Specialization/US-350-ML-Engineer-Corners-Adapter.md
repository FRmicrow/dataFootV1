# US-350: Corners Adapter & Feature Engineering

**Role**: Machine Learning Engineer
**Objective**: Integrate corner-specific features into the ML pipeline to enable accurate Corner market predictions.

## Description
Develop a `CornersAdapter` for the `TemporalFeatureFactory` that extracts historical corner data while strictly adhering to the "Morning-Of" leakage prevention rule.

## Acceptance Criteria
- [ ] `CornersAdapter` class implemented in `time_travel.py`.
- [ ] Features extracted:
  - `mom_corners_f_3/5/10`: Rolling average corners earned.
  - `mom_corners_a_3/5/10`: Rolling average corners conceded.
  - `corner_efficiency`: Corners per 1.0 xG.
- [ ] Integration with `TemporalFeatureFactory.get_vector`.
- [ ] Unit tests pass for corner feature calculation.

## Test Scenarios / Proof
- **Logic Verification**: Test with a known fixture ID and verify that `mom_corners_f_5` matches the database average for the previous 5 games.
- **Leakage Test**: Ensure no corners from the match day are included in the features.
