# User Story: V3 Schema POC - Mass Import Re-implementation

**ID**: US-V3-001  
**Title**: POC: Mass Import Implementation using V3 Schema  
**Role**: Full Stack (Frontend + Backend + DB)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Developer validating the new V3 architecture,  
**I want** a dedicated import page that ingests data directly into the new `V3_` tables,  
**So that** I can prove the efficiency and structure of the new schema without breaking the existing V2 application.

---

## 🎨 Context & Problem
We are exploring a V3 schema (`DATABASE_SCHEMA_V3.md`) to better align with the API-Football structure. We need a "Proof of Concept" (POC) implementation that:
1.  Creates the new V3 tables alongside the existing V2 ones (no destructive changes).
2.  Provides a UI to mass-import data into these specific V3 tables.

---

## ✅ Acceptance Criteria

### 1. Database Implementation (DB Agent)
- [ ] **Create V3 Tables**: Implement the schema defined in `DATABASE_SCHEMA_V3.md`.
    - `V3_Countries`, `V3_Leagues`, `V3_League_Seasons`, `V3_Teams`, `V3_Venues`, `V3_Players`, `V3_Fixtures`, `V3_Player_Stats`.
    - **Crucial**: Ensure all V3 tables are prefixed with `V3_` to avoid conflicts.

### 2. Backend Logic (Backend Agent)
- [ ] **New Endpoint**: `POST /api/v3/import/league`
    - Input: `{ leagueId: number, season: number }`
    - Logic:
        1.  Fetch League & Season info -> Insert into `V3_Leagues` / `V3_League_Seasons`.
        2.  Fetch Teams -> Insert into `V3_Teams`.
        3.  Fetch Players & Stats -> Insert into `V3_Players` & `V3_Player_Stats`.
        4.  Update `V3_League_Seasons.imported_players = true`.
- [ ] **Data Mapping**: strict mapping from API-Football response to V3 columns (e.g., `games.minutes` -> `V3_Player_Stats.minutes`).

### 3. Frontend UI (Frontend Agent)
- [ ] **New Page**: `/v3/import` (Prefix with "V3 POC").
- [ ] **Form**:
    - Select Country (API-Football countries).
    - Select League (API-Football leagues).
    - Select Season (2010-2024).
    - **"Import to V3" Button**.
- [ ] **Feedback**: Display a log or success message confirming data is in V3 tables (e.g., "Imported 450 players into V3_Players").

---

## 🛠 Technical Notes
- **Isolation**: V3 code must live in `backend/src/controllers/v3/` and `frontend/src/components/v3/` to prevent mixing with the V2 production codebase.
- **Routes**: Mount new routes under `/api/v3`.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_V3_POC_Import.md`
