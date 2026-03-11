# US-351: Discipline (Cards) Adapter & Feature Engineering

**Role**: Machine Learning Engineer
**Objective**: Integrate discipline-specific features (cards, fouls) into the ML pipeline for Cards market predictions.

## Description
Develop a `DisciplineAdapter` for the `TemporalFeatureFactory` to extract historical card and foul data.

## Acceptance Criteria
- [ ] `DisciplineAdapter` class implemented in `time_travel.py`.
- [ ] Features extracted:
  - `mom_yellow_3/5/10`: Rolling average yellow cards.
  - `mom_red_3/5/10`: Rolling average red cards.
  - `mom_fouls_3/5/10`: Rolling average fouls.
  - `pressure_index_ga`: Ratio of xG Against / Possession (stress marker).
- [ ] Integration with `TemporalFeatureFactory.get_vector`.
- [ ] Unit tests pass for discipline feature calculation.

## Test Scenarios / Proof
- **Logic Verification**: Verify that `mom_yellow_10` correctly reflects the team's card history from the database.
- **Stress Test**: Verify that `pressure_index_ga` is calculated correctly for teams under heavy pressure.
