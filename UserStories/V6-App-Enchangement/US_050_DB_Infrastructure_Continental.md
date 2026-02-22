# US_050: Database Infrastructure & Continental Re-structuring

**Role: DB / Backend Architect**

## User Story
**As a** System Architect  
**I want** to extend the database schema and restructure continental attribution  
**So that** we have a clean hierarchy (Continent > Country > League) for all data operations.

## Acceptance Criteria
- **Given** the `V3_Leagues` table  
- **When** I check the schema  
- **Then** I find an `importance_rank` field (INTEGER, indexed, default: 999).
- **Given** the requirement for continental separation  
- **When** a "Virtual Country" is needed for Continental Competitions (e.g., "Europe", "South America", "Africa")  
- **Then** these must be created in `V3_Countries` with an appropriate `continent` field and high `importance_rank`.
- **Given** a competition is Continental (e.g., UEFA Champions League, Copa America)  
- **When** the migration runs  
- **Then** it must be re-linked from the "World" country to its respective "Virtual Continent Country".
- **Given** the `World` country record  
- **Then** it must strictly contain only global competitions (FIFA World Cup, etc.).

## Functional Notes
- Continental re-mapping ensures that we can group "Champions League" under "Europe" instead of "World", allowing cleaner sidebar navigation and filtering.

## Technical Notes
- **Schema Update**: `ALTER TABLE V3_Leagues ADD COLUMN importance_rank INTEGER DEFAULT 999;`
- **Indexing**: Add index on `V3_Leagues(importance_rank)`.
- **Migration**: Identify leagues belonging to UEFA, CONMEBOL, AFC, CAF, CONCACAF and update their `country_id` to the new Virtual Countries IDs.
- **Validation**: 100% of continental competitions previously under "World" must be re-assigned.
