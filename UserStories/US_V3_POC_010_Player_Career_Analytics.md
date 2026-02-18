# US-V3-POC-010: Advanced Player Career Analytics

**ID**: US-V3-POC-010  
**Title**: POC: Multi-Filter Career Views and Aggregated Club Totals  
**Role**: Full Stack (Frontend + Backend)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Scout,  
**I want** to analyze a player's career through different lenses (by year, by club, or by country) and see their total impact at each club,  
**So that** I can get a comprehensive historical overview of their journey.

---

## ✅ Acceptance Criteria

### 1. Career Summary (Aggregation)
- [ ] **Section**: At the top of the "Career" tab, add a **"Club Totals"** table.
- [ ] **Logic**: Sum all statistical data for the player across **all years** for each unique club.
- [ ] **Columns**: Club Logo | Club Name | Total Matches | Total Goals | Total Assists | Avg Rating.

### 2. Advanced Career View Switcher
Implement a Filter/Tab system to switch between 3 views:
1. **By Year (Timeline)**: The standard chronological list (Most recent year top).
2. **By Club**: 
    - Group all seasons by Club.
    - Sort groups by the **most recent season played at that club**.
    - E.g., If a player was at Liverpool (2018-2023) and Chelsea (2024), Chelsea group comes first.
3. **By Country**:
    - Group all seasons by the Country of the league.
    - Sort groups by the **most recent season played in that country**.
    - **Constraint**: If multiple clubs were played in the same country, they stay grouped under that country header, ordered by year.

### 3. Detail & Navigation
- [ ] Clicking on a Club in the career list takes the user to that Club's V3 profile.
- [ ] Clicking a League/Year takes the user to that V3 League Season overview.

---

## 🛠 Technical Notes
- **Backend**: Update `GET /api/v3/player/:id` to include an `aggregatedStats` object that pre-calculates the club totals.
- **Frontend State**: Handle the grouping/sorting logic primarily in the frontend for a snappy UI experience.
- **Hierarchy Mapping**:
    - *By Country* logic requires joining `V3_Leagues` to find the `country_name`.
