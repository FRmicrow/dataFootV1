# User Story: V3 POC - Imported Leagues & Data Explorer

**ID**: US-V3-POC-005  
**Title**: Imported Leagues List & Data Viewer  
**Role**: Full Stack (Frontend + Backend)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User,  
**I want** to see a list of leagues I have imported, sorted by data volume, and drill down into their player tables,  
**So that** I can verify the data quality and content.

---

## 🎨 Context & Problem
We need a "Data Browser" to see what's actually in the DB.

---

## ✅ Acceptance Criteria

### 1. Leagues List Page (`/v3/leagues`)
- [ ] **Backend Endpoint**: `GET /api/v3/leagues/imported`
    - Logic: Query `V3_Leagues` joined with `V3_Player_Stats`.
    - Return: List of `{ league_id, name, logo, seasons_count, total_players, last_updated }`.
    - **Sorting**: Order by `total_players DESC`.
- [ ] **Frontend UI**:
    - Display Cards for each league.
    - Card Content: Logo, Name, "Available Seasons: [2021, 2022]", "Total Players: 1,450".
    - Action: Click -> Go to League Detail.

### 2. League Detail & Player Table (`/v3/league/:id`)
- [ ] **Sidebar/Menu**: List of available years for this league (e.g., 2021, 2022).
    - Default to the most recent year.
- [ ] **Data Table**:
    - Columns: Player Photo | Name | Team | Position | Matches | Goals | Assists | Rating.
    - **Filter**: Dropdown/Tabs to switch Year.
    - **Pagination**: 50 rows per page.
- [ ] **Backend Endpoint**: `GET /api/v3/league/:id/players?year=2023`
    - Logic: Join `V3_Player_Stats` with `V3_Players` and `V3_Teams`.

---

## 🛠 Technical Notes
- **Query Optimization**: `COUNT(*)` on stats might be slow. Consider caching the "Total Players" count in `V3_League_Seasons` during import.
