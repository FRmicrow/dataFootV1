# US_081: Smart Squad Explorer & Overview Refinement

**Role: Frontend Developer**

## User Story
**As a** Data Analyst  
**I want** a more interactive Squad Explorer in the Overview tab  
**So that** I can dynamically sort and navigate through the league's player database.

## Acceptance Criteria
- **Given** the **Overview** tab  
- **When** rendered  
- **Then** the "Participating squad directory" (Accordion grid) at the bottom must be removed.
- **Given** the **Squad Explorer** table  
- **When** initialized  
- **Then** it must be sorted by **Goals Scored (DESC)** by default.
- **Given** any column header (Player, Team, Pos, Apps, Mins, G, A, Y, R, Rating)  
- **When** clicked  
- **Then** the table must sort by that column (toggle ASC/DESC).
- **Given** the Team name column  
- **When** a team name is clicked  
- **Then** it must redirect the user to the respective Team Detail page.

## Functional Notes
- Ensure the table layout remains clean and the "Top 15" limit is either removed or made paginated if performance allows.

## Technical Notes
- **Component**: Update `SquadExplorer.jsx`.
- Implement client-side sorting or add `sortBy` and `order` parameters to the `api.getSeasonPlayers` call and handle it in `seasonController.js`.
- Use `react-router-dom` `Link` for the team redirects.
