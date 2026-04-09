# US_083: Professional Roster Hub (Restored Squad Tab)

**Role: Frontend Developer / UX**

## User Story
**As a** Scout or Data Manager  
**I want** a dedicated 2-column Roster Hub in the Squad tab  
**So that** I can explore team rosters and individual player stats with high efficiency.

## Acceptance Criteria
- **Given** the **Squad** tab  
- **When** rendered  
- **Then** it must use a **Split-View Panel**:
    - **Left Panel (Master)**: List of Teams.
        - Sorted by Ranking (Leagues) or Performance/Final Result (Cups).
    - **Right Panel (Detail)**: Active Roster and Player Cards.
- **Given** a selected Team on the left  
- **When** viewed on the right  
- **Then** players must be listed and sorted by **Appearances (DESC)**.
- **When** a player is clicked  
- **Then** show a **Player Profile Card** on the right (or modal if space is tight) including:
    - Photo, Age, Role, Preferred foot.
    - Key stats distribution (Apps, Goals, Assists, Yellow/Red).
- **Given** the roster view  
- **Then** retain the "Position Distribution" overview (e.g., number of GKs, DFs, MFs, FWs).

## Functional Notes
- This restores the "Excellent Structure" that was previously praised but lost in the V3 migration.
- The UI should feel fast and fluid when switching between teams.

## Technical Notes
- **Component**: Major rewrite of `SquadList.jsx`.
- Implement a `TeamSelector` sidebar and a `PlayerDetails` viewer.
- Maintain the state of the `selectedTeamId` at the page level to ensure persistence when switching tabs and coming back.
