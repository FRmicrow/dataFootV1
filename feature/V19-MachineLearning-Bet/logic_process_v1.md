# Logic Documentation: PROCESS_V1 Feature Engineering

This document explains exactly how the `PROCESS_V1` features are constructed. These features focus on "game dynamics" and "playing style" using rolling averages.

## 1. Global Constraints
- **Anti-Leakage**: All rolling window calculations only look at matches where `date < current_fixture.date`.
- **Windows**:
  - `Last 5 matches` (L5)
  - `Last 10 matches` (L10)
- **Horizons**: Like BASELINE_V1, these are calculated within `FULL`, `5Y`, and `3Y` historical scopes.

## 2. Data Coverage
- **Start Date**: ~ Juin 2017.
- **Raison**: Les statistiques détaillées (tirs, possession, corners) nécessaires à `PROCESS_V1` ne sont disponibles de manière consistante dans `V3_Fixture_Stats` qu'à partir de cette période.
- **Comparaison**: `BASELINE_V1` remonte jusqu'à 2008 car il ne dépend que des fixtures, ratings et classements.

## 3. Feature Construction

### A. Rolling Basic Stats
Calculates the average per match for:
- `shots_on_goal`
- `shots_total`
- `corner_kicks`
- `fouls`
- `yellow_cards`
- `red_cards`
- `ball_possession_pct` (Uses the cleaned integer column from US-1902)

### B. Efficiency Ratios
- **SOT Rate**: `avg(shots_on_goal) / avg(shots_total)`
- **Pass Accuracy Rate**: `avg(passes_accurate) / avg(passes_total)`

### C. First-Half Intensity
Same statistics as above, but filtered specifically for `half = '1H'`. This is crucial for half-time prediction submodels.

### D. Control Index
A composite score reflecting how much a team controls the game flow:
```python
control_index = (possession_avg_5 * 0.4) + \
                (pass_accuracy_rate_5 * 0.3) + \
                (shots_on_goal_per_match_5 * 0.3)
```

## 3. Storage Format
Stored in `V3_Team_Features_PreMatch` with `feature_set_id = 'PROCESS_V1'`.
Example JSON:
```json
{
  "sot_per_match_5": 4.2,
  "shots_per_match_5": 12.5,
  "possession_avg_5": 52.4,
  "sot_rate_5": 0.336,
  "control_index_5": 8.1,
  "sot_per_match_1h5": 2.1
}
```
