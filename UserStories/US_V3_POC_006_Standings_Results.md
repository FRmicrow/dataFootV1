# User Story: V3 POC - League Standings & Match Results

**ID**: US-V3-POC-006  
**Title**: POC: Import and Visualize League Standings & Full Match Results  
**Role**: Full Stack (Frontend + Backend + DB)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User looking at a competition season,  
**I want** to see the official rankings (Standings) and all match results organized by round (Day by Day),  
**So that** I can follow the competition's progress and results history.

---

## 🎨 Technical Refinement & Analysis

### 1. API-Football Endpoints
- **Standings**: `GET /standings?league={id}&season={year}`. Returns the ranking table. For Cups, it often contains group stages.
- **Fixtures**: `GET /fixtures?league={id}&season={year}`. Returns all matches. Each match contains a `league.round` field (e.g., "Regular Season - 1", "Round of 16", "Final").

### 2. Database Schema Impact (V3)
- **New Table `V3_Standings`**: Required to store snapshots of ranks, points, and goal differences.
- **Expansion of `V3_Fixtures`**: Must store `league_id`, `season`, and `round` to allow filtering day-by-day.

### 3. League vs Cup Logic
- **Leagues**: Visualized as a standard table (Rank, P, W, D, L, GF, GA, GD, Pts).
- **Cups**: 
    - If groups exist: Multiple standing tables.
    - If knockout: Show fixtures grouped by round (Bracket-style or chronological list).

---

## ✅ Acceptance Criteria

### 1. Database Implementation (DB Agent)
- [ ] **Create `V3_Standings`**:
    - `standings_id (PK)`, `league_id (FK)`, `season (INT)`, `team_id (FK)`, `rank (INT)`, `points (INT)`, `played (INT)`, `win (INT)`, `draw (INT)`, `lose (INT)`, `goals_for (INT)`, `goals_against (INT)`, `update_date (DATETIME)`.
- [ ] **Update `V3_Fixtures`**:
    - Ensure columns exist for: `fixture_api_id`, `league_id`, `season`, `round (TEXT)`, `date (DATETIME)`, `home_team_id`, `away_team_id`, `goals_home`, `goals_away`, `status (SHORT_CODE)`.

### 2. Backend Logic (Backend Agent)
- [ ] **Expand Import Controller**:
    - Add `importStandingsV3(leagueId, season)`: Fetches from API and populates `V3_Standings`.
    - Add `importFixturesV3(leagueId, season)`: Fetches from API and populates `V3_Fixtures`.
- [ ] **New API Endpoints**:
    - `GET /api/v3/league/:id/standings?year=2023`
    - `GET /api/v3/league/:id/fixtures?year=2023&round=xxx` (allow filtering by round).

### 3. Frontend UI (Frontend Agent)
- [ ] **League Detail Page Update**:
    - Add a **"Standings"** Tab: Display the table from `V3_Standings`.
    - Add a **"Matches"** Tab: 
        - Sidebar or Dropdown to select a **"Round"** (e.g., "Round 1", "Round 2").
        - List of matches for that round with scores.
- [ ] **Special Handling**: 
    - If the competition type is "Cup", show "Group Stage" standings if available, otherwise focus on the knockout rounds (Final, Semi-final).

---

## 🛠 Technical Notes
- **Round Formatting**: API-Football rounds can be messy (e.g., "Regular Season - 38"). The FE should try to clean these up or group them logically.
- **Winner detection**: For Cups, the winner is usually the winner of the fixture with round = "Final".

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_V3_POC_006_Standings_Results.md`
