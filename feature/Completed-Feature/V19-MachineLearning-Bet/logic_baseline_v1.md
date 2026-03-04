# Logic Documentation: BASELINE_V1 Feature Engineering

This document explains exactly how the `BASELINE_V1` features are constructed and how the script ensures data integrity and anti-leakage.

## 1. Global Constraints
- **Anti-Leakage**: All queries use a strict `date < current_fixture.date` condition. No data from the match itself or the future is ever included in the features.
- **Independence**: All features are stored in the `V3_Team_Features_PreMatch` table. This is purely additive and does not impact existing application flows.
- **Horizon Types**:
  - `FULL_HISTORICAL`: Uses all available historical data.
  - `5Y_ROLLING`: Only uses data from the 5 years preceding the match.
  - `3Y_ROLLING`: Only uses data from the 3 years preceding the match.

## 2. Feature Construction

### A. Elo Score
- **Source**: `V3_Team_Ratings`
- **Logic**: Retrieves the most recent `elo_score` recorded for the team in the specific league before the match date.
- **Fallback**: 1500 (standard baseline Elo).

### B. Standings Snapshot
- **Source**: `V3_Standings`
- **Logic**: Retrieves the latest recorded rank, points, and goals difference for the team in the current season as of the match date.
- **Features Captured**: `rank`, `points`, `goals_diff`, `played`.
- **Handling Early Season**: If no standing exists (e.g., first match of the season), these values will be set to league averages or neutral defaults (Rank: Median, Points: 0).

### C. Lineup Strength (v1)
- **Source**: `V3_Fixture_Lineup_Players` + `V3_Fixture_Player_Stats`
- **Logic**: 
  1. Identify the 11 starters for the current match.
  2. For each starter, look back at their performance in up to 20 previous matches (within the horizon).
  3. Calculate a "Performance Score" per match for each player using this formula:
     ```python
     score = (2.0 * goals_total) + 
             (1.5 * goals_assists) + 
             (0.05 * passes_key) + 
             (0.03 * duels_won) + 
             (0.04 * shots_on) + 
             (0.02 * tackles_total) - 
             (0.5 * cards_yellow) - 
             (2.0 * cards_red)
     ```
  4. Average these match scores per player over their historical matches.
  5. Sum the averages for all starters to get the `lineup_strength_v1`.
- **Normalization**: The final score is divided by the number of starters found to ensure consistency if a lineup is partially missing.

## 3. Storage Format
Features are stored as a JSON object in the `features_json` column of `V3_Team_Features_PreMatch`.
Example:
```json
{
  "elo": 1642.5,
  "rank": 3,
  "points": 45,
  "goals_diff": 22,
  "played": 21,
  "lineup_strength_v1": 7.42,
  "missing_starters_count": 0
}
```
