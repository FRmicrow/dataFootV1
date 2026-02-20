# User Story: V3 POC - Real Data Import Logic

**ID**: US-V3-POC-004  
**Title**: Implement V3 Mass Import Logic (Real Database Writes)  
**Role**: Backend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Developer,  
**I want** the "Import" button to actually fetch data from API-Football and write it into the `V3_*` tables,  
**So that** the database is populated with real-world data for testing.

---

## 🎨 Context & Problem
The UI exists, but the backend logic for `POST /api/v3/import/batch` needs to be fully implemented to populate `V3_Leagues`, `V3_League_Seasons`, `V3_Teams`, `V3_Players`, and `V3_Player_Stats`.

---

## ✅ Acceptance Criteria

### 1. Endpoint Implementation (`importLeagueDataV3`)
- [ ] **Input**: `{ selection: [{ leagueId: 39, seasons: [2022, 2023] }] }`
- [ ] **Process (Per League/Season)**:
    1.  **Check/Insert League**: `V3_Leagues` (API ID, Name, Country, Logo).
    2.  **Check/Insert Season**: `V3_League_Seasons` (League ID, Year, `is_current`).
    3.  **Fetch Teams**: Call `items.teams`. Insert into `V3_Teams` (API ID, Name, Code, Venue Info).
    4.  **Fetch Players (Page Loop)**: Call `players` endpoint.
        - **Upsert Player**: `V3_Players` (Height, Weight, Nationality).
        - **Insert Stats**: `V3_Player_Stats` (Team ID, League ID, Season, Minutes, Goals, Assists, etc.).
    5.  **Completion**: Update `V3_League_Seasons.imported_players = TRUE`.

### 2. Constraints & Integrity
- [ ] **Idempotency**: If I run import for "Premier League 2023" twice, it should UPDATE stats, not duplicate them.
    - Use `ON CONFLICT` or check existence before insert.
- [ ] **Transaction**: Wrap the player batch in a transaction commit.

### 3. Feedback Stream
- [ ] **SSE**: Stream logs ("Saved 450 players...", "Finished Team X...") to the frontend.

---

## 🛠 Technical Notes
- **Mapping**: Consult `DATABASE_SCHEMA_V3.md`.
    - `api.player.firstname` -> `V3_Players.firstname`
    - `api.statistics[0].games.minutes` -> `V3_Player_Stats.minutes`
