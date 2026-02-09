# US-V3-POC-008: League Detail & Standing Refinement

**ID**: US-V3-POC-008  
**Title**: POC: Rework League Overview and Fix UI Contrast  
**Role**: Full Stack (Frontend + Backend)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User analyzing a league season,  
**I want** a polished overview that focuses on player performance across teams and a high-contrast standing table,  
**So that** the data is professional, readable, and easy to filter.

---

## ✅ Acceptance Criteria

### 1. Overview Tab Rework (Frontend)
- [ ] **Remove Simulated Standing**: Since there is now a dedicated "Standing" tab, remove the simulated table from the Overview.
- [ ] **Player Stats UI Review**:
    - Refresh the "Leader Cards" (Top Scorers/Assists). 
    - Improve typography and ensure text is vibrant against dark backgrounds.
- [ ] **Dynamic Squad Explorer section**:
    - **Filter**: Add a "Select Team" dropdown (listing all teams in the season).
    - **Filter**: Add a "Position" selector (GK, DEF, MID, ATK, ALL).
    - **The Table**: Display a master table of players meeting the filters.
        - **Default Sort**: `matches_played` DESC.
        - **Columns**: Photo | Name | Position | Matches | Minutes | Goals | Assists | Yellow | Red | Rating.
    - **Detail**: Ensure every player metric available in `V3_Player_Stats` is presented in this table.

### 2. Standing Tab Contrast Fix (Frontend)
- [ ] **UI Review**: Fix "dark on dark" issues.
- [ ] **Design**: 
    - Use clear borders or alternating row backgrounds.
    - Ensure text color (white/silver) has high contrast against the dark background.
    - Use neon/vibrant colors (green for Win, red for Loss) with enough luminosity.

---

## 🛠 Technical Notes
- **Backend Query**: The "Squad Explorer" needs an endpoint that supports `?team_api_id=X&position=Y`.
- **Contrast**: Target a contrast ratio of at least 4.5:1 for all text.
