# US-BE-004: Competition & Aggregation API

**Role**: Backend Expert Agent  
**Objective**: Expose high-performance endpoints for competition analysis.

## 📖 User Story
**As a** Data Provider,  
**I want** to provide aggregated statistical data for competitions and seasons,  
**So that** the frontend can display standings and leaderboards efficiently.

## ✅ Acceptance Criteria
1. **Seasons Endpoint**: `GET /api/competitions/:id/seasons`
    - Returns a unique list of years from `V2_player_statistics` where `competition_id = :id`.
2. **Season Aggregation Endpoint**: `GET /api/competitions/:id/season/:year`
    - Returns:
        - `competition`: Metadata (Name, Logo, Country).
        - `standings`: List of clubs with aggregated stats (SUM of goals, assists, etc. from all players in that club for that season).
        - `topPerformers`: Top 5 players in Goals, Assists for that league/year.
3. **Performance**: Use efficient SQL `GROUP BY` and `SUM` to ensure response time < 200ms despite large stats tables.
4. **Error Handling**: Return 404 if the competition or year doesn't exist.
