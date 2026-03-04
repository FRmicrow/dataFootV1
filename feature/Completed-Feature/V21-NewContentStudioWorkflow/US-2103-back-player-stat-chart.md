# US-2103: Backend - Player Stat Standing Logic

**Role**: Backend Engineer / Database Architect  
**Objective**: Implement the data accumulation logic for the new "Player Stat Standing" chart.

## Tasks
- Create a service method to query `V3_Fixture_Player_Stats`.
- Implement logic to accumulate stats (goals, assists, etc.) matchday by matchday for a selected league and season.
- Optimize the query to handle large datasets efficiently.

## Technical Requirements
- Accumulate data iteratively (Matchday 1, Matchday 1+2, Matchday 1+2+3...).
- Handle player transfers or multi-team appearances if necessary.
- Return a timeline format compatible with existing Studio charts (e.g., `BarChartRace`).

## Acceptance Criteria
- [ ] Endpoint `GET /api/v3/studio/data/player-standing` returns correctly formatted data.
- [ ] Top scorers are correctly identified for each matchday.
- [ ] Performance is acceptable for a full season (e.g., 38 matchdays).
