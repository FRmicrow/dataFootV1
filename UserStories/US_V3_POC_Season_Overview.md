# User Story: V3 POC - Season Overview Page

**ID**: US-V3-POC-002  
**Title**: POC: Build Season Overview Dashboard using V3 Schema  
**Role**: Full Stack (Frontend + Backend)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Developer or User exploring the V3 data,  
**I want** a dedicated page to view league statistics and standings for a specific season,  
**So that** I can validate that the V3 data structure correctly supports aggregating historical competition data.

---

## 🎨 Context & Problem
We have successfully imported data into the new `V3_` tables. Now we need a way to visualize it. This page will serve as the first "consumer" of the V3 schema, proving that queries across `V3_Leagues`, `V3_Teams`, and `V3_Player_Stats` work as expected.

---

## ✅ Acceptance Criteria

### 1. Backend: Data Aggregation Endpoint (Backend Agent)
- [ ] **Endpoint**: `GET /api/v3/league/:leagueId/season/:season`
- [ ] **Data Requirements**:
    - **League Metadata**: Name, Logo, Country (from `V3_Leagues`).
    - **Standings (Simulated)**:
        - Group player stats by `V3_Player_Stats.team_id`.
        - Calculate Team Totals: `Goals Scored`, `Assists`, `Matches Played`.
        - *Note*: We are summing player stats, not using a separate standings table yet.
    - **Top Performers**:
        - List top 5 Scorers (Goals).
        - List top 5 Playmakers (Assists).
- [ ] **Optimization**: Ensure the query uses the new `V3_` indexes for performance.

### 2. Frontend: Season Dashboard UI (Frontend Agent)
- [ ] **Route**: `/v3/league/:id/season/:year`
- [ ] **Header**: League Logo, Name, and "Season: 20XX" selector.
- [ ] **Tabs/Sections**:
    - **Overview**:
        - **"Simulated Table"**: List of Teams sorted by Goals Scored (as a proxy for performance).
        - Columns: Rank | Team | Goals | Assists | Squad Size.
    - **Top Players**:
        - "Golden Boot" card (Top Scorer).
        - "Top Assister" card.
    - **Teams Grid**: A simple grid of all teams participating in that season. clickable to go to a V3 Team detail page (future).

### 3. Navigation
- [ ] Add a way to navigate to this page from the Import Page (e.g., "View Data" button after import success).

---

## 🛠 Technical Notes
- **Schema Usage**: Strictly use `V3_Leagues`, `V3_League_Seasons`, `V3_Teams`, `V3_Player_Stats`. Do NOT join with V2 tables.
- **Aggregation**:
    ```sql
    SELECT t.name, SUM(ps.goals) as total_goals
    FROM V3_Player_Stats ps
    JOIN V3_Teams t ON ps.team_id = t.team_id
    WHERE ps.league_id = ? AND ps.season = ?
    GROUP BY t.team_id
    ORDER BY total_goals DESC
    ```

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_V3_POC_Season_Overview.md`
