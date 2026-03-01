# US_070: High-Density League API & Ranking Aggregator

**Role: Backend Developer**

## User Story
**As a** Backend Developer  
**I want** to provide an optimized API for the new League List view  
**So that** the frontend can efficiently render ranked hierarchies for International and National competitions.

## Acceptance Criteria
- **Given** a request to `/api/v3/leagues/structured`  
- **When** the server processes the request  
- **Then** it must return a payload grouped by:
    - **International**: Sub-grouped into "Global" (World Country) and "Continental" (Virtual Continent Countries).
    - **National**: Grouped by Country, sorted by Country `importance_rank`.
- **Given** the competition list within a country  
- **When** delivered to the frontend  
- **Then** it must be strictly sorted by `League.importance_rank ASC`.
- **Given** a league record  
- **Then** it must include metadata: `is_cup`, `rank`, `continent`, and `total_seasons_imported`.

## Functional Notes
- The "National" group should only contain countries that have at least one imported league.
- The distinction between League and Cup should be derived from the `V3_Leagues.type` field.

## Technical Notes
- **API Endpoint**: Create `GET /api/v3/leagues/structured`.
- **SQL**: Use optimized joins between `V3_Leagues` and `V3_Countries`.
- **Cache**: Implement a simple cache (5 min) as this data is relatively static but high-volume.
