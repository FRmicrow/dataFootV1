# US-V3-FE-006: Standings & Results UI (Frontend)

**Role**: Frontend Expert Agent  
**Objective**: Create a high-fidelity interface for browsing league tables and match-by-match results.

## 📖 User Story
**As a** User,  
**I want** a "Day-by-Day" browser for matches and a clear Standing table,  
**So that** I can see who was leading the league at any time and review specific match results.

## ✅ Acceptance Criteria

### 1. League Standing Tab
- [ ] **Display**: A standard football table (Rank, Team, P, W, D, L, +/- , Pts).
- [ ] **Interactive**: Clicking a team name navigates to that team's V3 profile.
- [ ] **Multi-Group Support**: If a competition has groups (e.g. World Cup), render multiple tables.

### 2. Match Results Tab (Day-by-Day)
- [ ] **Round Selector**: A dropdown or horizontal scrollbar to select the "Round" (e.g., "Regular Season - 1", "Round 16", "Final").
- [ ] **Match List**: Show results for the selected round.
    - Format: `[Home Team Logo] [Home Name] [Score] - [Score] [Away Name] [Away Team Logo]`.
- [ ] **Bracket View (Optional/Bonus)**: For knockout stages, ideally group by round name (Final, Semi-final).

### 3. UX/Aesthetics
- [ ] **Loading states**: Show skeletons while fetching large fixture lists.
- [ ] **Theme**: Adhere to the V3 "Sport-Tech" aesthetic (Glassmorphism, Neon status indicators for W/D/L).

## 🛠 Integration
- **Endpoints**: 
    - `GET /api/v3/league/:id/standings?year=2023`
    - `GET /api/v3/league/:id/fixtures?year=2023`
