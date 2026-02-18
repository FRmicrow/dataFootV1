# US-V3-BE-006: Standings & Fixtures API (Backend)

**Role**: Backend Expert Agent  
**Objective**: Implement the data ingestion and retrieval logic for league rankings and match results into the V3 schema.

## 📖 User Story
**As a** Backend Developer,  
**I want** to fetch and store official standings and full match fixtures from API-Football,  
**So that** the system can provide a complete historical view of how a competition was won.

## ✅ Acceptance Criteria

### 1. Database Schema Preparation
- [ ] **Create `V3_Standings`**:
    - Columns: `id (PK)`, `league_id (FK)`, `season (INT)`, `team_id (FK)`, `rank (INT)`, `points (INT)`, `played (INT)`, `win (INT)`, `draw (INT)`, `lose (INT)`, `goals_for (INT)`, `goals_against (INT)`, `group_name (TEXT)`, `update_date (DATETIME)`.
- [ ] **Update `V3_Fixtures`**: Ensure it handles `fixture_api_id`, `round (TEXT)`, `status (SHORT)`, and `date`.

### 2. Ingestion Logic (`importLeagueControllerV3.js`)
- [ ] **`importStandings(leagueId, season)`**:
    - Call API `/standings`.
    - Upsert data into `V3_Standings`. Handle multiple groups (e.g., Champions League groups).
- [ ] **`importFixtures(leagueId, season)`**:
    - Call API `/fixtures`.
    - Upsert data into `V3_Fixtures`. Store the `round` field exactly as provided by the API.

### 3. API Endpoints
- [ ] **`GET /api/v3/league/:id/standings?year=2023`**:
    - Returns the ranked list of teams.
- [ ] **`GET /api/v3/league/:id/fixtures?year=2023`**:
    - Returns all matches.
    - **Feature**: Include a list of unique `rounds` available for that season in the response header or metadata.

## 🛠 Technical Notes
- **Idempotency**: Use `api_id` where available to prevent duplicates.
- **League vs Cup**: If `/standings` returns no data (some cups), ensure the API handles it gracefully without error.
