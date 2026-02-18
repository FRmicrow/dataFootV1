# US-FE-004: Interactive Competition Portal

**Role**: Frontend Expert Agent  
**Objective**: Build a high-end dashboard for competition data exploration.

## 📖 User Story
**As a** Football Enthusiast,  
**I want** to browse a competition (e.g., Premier League) and see its history, standings, and top performers for any given year,  
**So that** I can analyze how the league has evolved and who the stars were in a specific season.

## ✅ Acceptance Criteria
1. **Dynamic Route**: Create `/competition/:id` and `/competition/:id/:year`.
2. **Season Sidebar/Dropdown**: A sleek selector showing all available years for this competition in the DB.
3. **Statistical "Standings"**: 
    - Since we use player-centric data, build a table showing Clubs with columns: [Club | Matches Played | Total Goals | Total Assists | Clean Sheets].
    - This table should be sortable.
4. **Season Leaders (MVP Cards)**: 
    - Top Goalkeeper: Most clean sheets or fewest goals conceded (if stats allow).
    - Top Scorer: Detailed card showing the player with most goals in that competition year.
    - Top Playmaker: Detailed card for most assists.
5. **UI Palette**: Use the "Sport-Tech" aesthetic (Deep charcoal backgrounds, neon accents for stats, semi-transparent cards).

## 🛠 Integration
- **API**: `GET /api/competitions/:id/season/:year`
- **Navigation**: Clicking a club logo takes you to that club's profile for that year.
