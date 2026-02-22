# US_052: Ranking-Aware Data Services & APIs

**Role: Backend Developer**

## User Story
**As a** Backend Developer  
**I want** to update all data retrieval services to respect the importance hierarchy  
**So that** the most relevant competitions are always delivered first to the user.

## Acceptance Criteria
- **Given** the `/api/leagues` or `/api/dashboard` endpoints  
- **When** data is requested  
- **Then** the results must be sorted by `Country.importance_rank ASC` AND `League.importance_rank ASC`.
- **Given** a Continent-based search  
- **When** I filter by "Europe"  
- **Then** Top leagues (PL, La Liga, UCL) must appear before lower-tier leagues.
- **Given** the Player Profile page (Statistics collection)  
- **When** listing a player's seasonal participations  
- **Then** the primary league and major tournaments (UCL) must be displayed before secondary cups.

## Functional Notes
- This story ensures that the hard work done in the DB/Logic layer is actually reflected in the data payloads sent to the frontend.

## Technical Notes
- **SQL Updates**: Update all `ORDER BY` clauses to: `c.importance_rank ASC, l.importance_rank ASC, l.name ASC`.
- **Join Enforcement**: Ensure `V3_Leagues` queries always join with `V3_Countries` to access the country rank.
- **Fallback**: If `importance_rank` is the same (e.g., both 999), fallback to alphabetical sorting by name.
