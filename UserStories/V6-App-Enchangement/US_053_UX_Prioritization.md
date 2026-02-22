# US_053: Premium UX: Importance-Based UI Prioritization

**Role: Frontend Developer**

## User Story
**As a** User  
**I want** to see major competitions and matches at the top of my lists  
**So that** I don't have to scroll through "Amateur" or "Minor" data to find what matters to me.

## Acceptance Criteria
- **Given** the Dashboard (Match List)  
- **When** the page loads  
- **Then** matches from "Tier 1" leagues must be grouped and shown first.
- **Given** the Search Results  
- **When** I search for a term  
- **Then** leagues and teams from high-ranked competitions must have higher visibility in the results list.
- **Given** the League List sidebar/navigation  
- **When** I view by Continent  
- **Then** the "Big 5" European leagues and the Champions League must be the primary items shown.
- **Given** a Player's Trophies/Stats  
- **When** I view their career  
- **Then** major league titles and international cups must be visually prioritized (e.g., highlighted or at the top).

## Functional Notes
- This is a system-wide UI/UX clean-up to ensure that "Visual Noise" is reduced by prioritizing high-importance data.

## Technical Notes
- **Sorting Logic**: While the API will provide sorted data, ensure that frontend grouping logic (e.g., `reduce` by country/league) maintains this order.
- **UI Components**: Update `V3LeaguesList`, `V3Dashboard`, `SearchPageV3`, and `PlayerProfilePageV3`.
- **Validation**: Ensure that "Virtual Continent" countries (created in US_050) are rendered correctly (using a generic continent flag or specific asset if available).
