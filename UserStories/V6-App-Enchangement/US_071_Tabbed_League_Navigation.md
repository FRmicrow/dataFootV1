# US_071: Competitive Hierarchy UX: National & International Tabs

**Role: Frontend Developer**

## User Story
**As a** User  
**I want** a tabbed interface to separate International tournaments from National leagues  
**So that** I can quickly navigate to the type of competition I am interested in.

## Acceptance Criteria
- **Given** the League Page loads  
- **When** initialized  
- **Then** the **International** tab is active by default.
- **Given** the International Tab  
- **When** viewed  
- **Then** it displays two distinct sections:
    1. **Global Competitions** (e.g., World Cup).
    2. **Continental Competitions** (e.g., Champions League, AFC Cup) grouped by their respective continents.
- **Given** the National Tab  
- **When** viewed  
- **Then** it displays countries sorted by their `importance_rank`.
- **Given** a Country section  
- **Then** show only the **Top 5** competitions by rank.
- **When** more than 5 competitions exist for a country  
- **Then** secondary items must be hidden inside an accordion labeled: `"+ [X] other competitions"`.

## Functional Notes
- The landing page must feel fast and "uncluttered".
- Accordions must be closed by default to save vertical space.

## Technical Notes
- Use a robust Tab component state.
- Implement the "Top 5" logic using Array `slice(0, 5)` for the primary list and the remainder for the accordion body.
- Update `V3LeaguesList.jsx` to replace active tab logic.
