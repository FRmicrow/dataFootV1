# US-V3-POC-007: Improved League Architecture & Drill-down

**ID**: US-V3-POC-007  
**Title**: POC: Refined League Explorer & Player Career Integration  
**Role**: Full Stack (Frontend + Backend)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User exploring the V3 database,  
**I want** a clean hierarchy for leagues (one entry per competition) with a deep statistical overview of seasons and players,  
**So that** I can analyze results and player careers without redundant navigation.

---

## ✅ Acceptance Criteria

### 1. Unified League Explorer (Frontend & Backend)
- [ ] **Backend**: Update `GET /api/v3/leagues/imported` to return unique leagues.
    - Logic: `GROUP BY league_id`.
    - Return: `{ id, name, logo, country, available_seasons: [2024, 2023, 2022], total_records }`.
- [ ] **Frontend**: Refactor the League list page to show **one card per League**.
    - Card displays the league name and a badge showing the number of available seasons.
    - Sort leagues alphabetically or by importance.

### 2. Enhanced Season Overview (Drill-down)
- [ ] **Archive Explorer**: On the League Detail page, implement a "Season Selector" (Tabs or Dropdown).
- [ ] **Default View**: Automatically load and display the **most recent year** in the database for that league.
- [ ] **Rich Metadata**: The overview must now include:
    - **Golden Boot Section**: Top 3 scorers with detailed cards (Photo, Name, Team, Goals).
    - **Top Assists Section**: Top 3 playmakers (Photo, Name, Team, Assists).
    - **Team Squads**: A section listing all Teams in that season. Clicking a team expands or shows a grid of their **full squad** for that specific year.

### 3. Player Career Integration
- [ ] **Player Links**: Everywhere a player name appears (Scorers, Squads), it must be a clickable link to `/v3/player/:id`.
- [ ] **Player Detail Page (`/v3/player/:id`)**:
    - **Header**: High-end player profile (Name, Photo, Nationality, Height/Weight).
    - **Career Stats History**:
        - Grouped by **Season**.
        - Sub-grouped by **Competition Category** (League, National Cup, International Cup, National Team).
        - Columns: Team | Competition | Matches | Goals | Assists | Yellow/Red | Rating.
- [ ] **Backend Service**: Create `GET /api/v3/player/:id` specifically for the V3 schema.

---

## 🛠 Technical Notes
- **V3 Category Mapping**: Use the `competition_type_id` or keywords (Cup, Champions, etc.) in the V3 competition tables to categorize stats.
- **Data Completeness**: Ensure that if a player had stats in two different teams in the same season, they are both displayed clearly.
- **Performance**: Use JOINs between `V3_Player_Stats`, `V3_Teams`, and `V3_Leagues` to build the career row.
