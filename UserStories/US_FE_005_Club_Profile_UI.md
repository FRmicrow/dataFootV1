# US-FE-005: Club Command Center UI

**Role**: Frontend Expert Agent  
**Objective**: Transform the existing club page into a premium data profile.

## 📖 User Story
**As a** Scout or Fan,  
**I want** a "hero-style" profile for every club that details their identity, roster history, and success,  
**So that** I have a single point of truth for a team's status.

## ✅ Acceptance Criteria
1. **Club Hero Section**: Use high-quality logos, large typography for the name, and a "Identity Card" (Stadium, City, Founded, Capacity).
2. **Squad Explorer (Tab 1)**: 
    - Selector for "Season".
    - Grid/Table of players with mini-stats (Goal/Game ratio, etc.).
    - Categorize squad by: Goalkeepers, Defenders, Midfielders, Forwards.
3. **Performance History (Tab 2)**: 
    - A timeline/list showing which competitions the club played in each year and their general activity level.
4. **Trophy Room (Tab 3)**: 
    - Visual display of trophies won by the club (from `V2_club_trophies`).
    - Use "Badge" icons for different trophy types.
5. **Uniformity**: Ensure the same card styles and table densities as the Competition page.

## 🛠 Integration
- **API**: `GET /api/team/:id` (updated) and `GET /api/team/:id/season/:year`.
