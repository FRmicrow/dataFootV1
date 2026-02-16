# US_37_V3_BE_Studio_League_Ranking_Processor

## 1. User Story
**As a** Content Creator using the Studio,
**I want to** generate a match-by-match ranking timeline for a specific league and season,
**So that** I can visualize the evolution of the championship race over time.

## 2. Technical Context
- **Endpoint**: `POST /api/v3/studio/query/league-rankings`
- **Data Source**: `V3_Fixtures`, `V3_Teams`.
- **Target**: Content Studio Data Engine.

## 3. Implementation Requirements

### 3.1 Input Parameters
The endpoint should accept:
- `league_id`: (Integer)
- `season`: (Integer, e.g., 2023)

### 3.2 Data Processing (The "Live Calculation")
Since the DB only stores scores, the backend must simulate the league table progression:
1.  **Fetch Fixtures**: Get all matches for the given league/season where `status` is 'FT'.
2.  **Round Sequencing**: Parse the `round` string (e.g., "Regular Season - 18") to extract the matchday number.
3.  **Cumulative Tally**: Iterate through rounds 1 to N:
    -   Cumulative **Points**: Win = 3, Draw = 1, Loss = 0.
    -   Cumulative **Goal Difference**: (Goals For - Goals Against).
    -   Cumulative **Goals For**.
4.  **Ranking Logic**: At each matchday, sort teams by:
    -   1. Points (desc)
    -   2. Goal Difference (desc)
    -   3. Goals For (desc)

### 3.3 Data Contract (Response)
Returns a standardized timeline compatible with the Studio Chart Renderer:
```json
{
  "meta": { "type": "league_rankings", "league_name": "Ligue 1", "season": 2023 },
  "timeline": [
    {
      "round": 1,
      "records": [
        { "id": 85, "label": "PSG", "image": "...", "value": 3, "rank": 1, "gd": 3, "gf": 4 },
        { "id": 91, "label": "Monaco", "image": "...", "value": 3, "rank": 2, "gd": 2, "gf": 2 },
        ...
      ]
    },
    ...
  ]
}
```

## 4. Acceptance Criteria
- [ ] Correctly calculates 3 pts for a win and 1 pt for a draw from `V3_Fixtures` scores.
- [ ] Correctly ranks teams based on official tie-breaking rules (GD, then GF).
- [ ] Returns a complete timeline from Round 1 to the latest played round.
- [ ] Respects the "League Only" constraint (ensure it works for round-based competitions).
