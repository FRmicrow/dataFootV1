# US-V3-POC-007a: Unified League Architecture & Season Dashboards

**ID**: US-V3-POC-007a  
**Title**: POC: Deduplicated League Explorer & Seasonal Statistical Overviews  
**Role**: Full Stack (Frontend + Backend)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User,  
**I want** to browse leagues without redundancy (only one entry per league) and see a deep statistical overview for each year,  
**So that** I can easily find historical rankings and squad lists.

---

## ✅ Acceptance Criteria

### 1. Unique League Hierarchy (Backend)
- [ ] **Endpoint**: `GET /api/v3/leagues/imported`
- [ ] **Logic**: Deduplicate by `league_id`.
- [ ] **Return**: `{ id, name, logo, country, years_imported: [2024, 2023, 2022] }`.

### 2. The "League Archive" Interface (Frontend)
- [ ] **League List**: Display **ONE card per league**.
- [ ] **Archive Explorer**: On the detail page, show the **most recent year** by default.
- [ ] **Season Selector**: Add a sidebar or tab-bar to switch between all years available for that specific league.

### 3. Rich Season Dashboard (Overview)
- [ ] **Standing**: Display the results from US-V3-BE-006.
- [ ] **Golden Boot & Top Assists**: 
    - Display Top 3 Scorers and Top 3 Assisters in specialized "Leader Cards" (Photo, Name, Team, Count).
- [ ] **Full Squad Directory**:
    - List all teams participating in that season.
    - Clicking a team expands to show their **entire roster** for that specific year (Position, Name, Matches).

---

## 🛠 Technical Notes
- **Deduplication**: Use `SELECT DISTINCT league_id` or `GROUP BY` in the backend.
- **Defaulting**: If no year is provided in the URL, query the max available year for that league ID.
