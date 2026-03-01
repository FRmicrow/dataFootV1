# US_060: Database Health Infrastructure & Schema Hardening

**Role: DB / Backend Architect**

## User Story
**As a** DB Architect  
**I want** to normalize the trophy schema and enforce strict API-ID integrity  
**So that** the database is cleared of legacy artifacts and prepared for automated remapping.

## Acceptance Criteria
- **Given** the `V3_Trophies` table  
- **When** I check the schema  
- **Then** it must include a `competition_id` field (FOREIGN KEY referencing `V3_Leagues.league_id`).
- **Given** existing trophy records  
- **When** the migration runs  
- **Then** it must resolve the `competition_id` based on the `league_name` and link them to the normalized `V3_Leagues` entry.
- **Given** any core entity (Player, Competition, Club, Fixture, Trophy)  
- **When** the cleanup script is executed  
- **Then** all rows where `api_id` is **NULL** must be deleted.
- **Given** the "World vs Country" trophy conflict  
- **When** a trophy is normalized  
- **Then** the `country` field in `V3_Trophies` must be overwritten by the Competition's home country record.

## Functional Notes
- This story sets the foundation for "Intelligent Cleanup". Without a `competition_id` in trophies, we cannot reliably detect international vs domestic duplicates.

## Technical Notes
- **Schema Update**: `ALTER TABLE V3_Trophies ADD COLUMN competition_id INTEGER;`
- **Integrity**: Any removal of a record must be logged in a dedicated `V3_Cleanup_History` table (already exists or to be refined) with the reason "MISSING_API_ID".
- **Remapping Script**: A SQL utility must be provided to find the best `V3_Leagues` match for string-based `league_name` in trophies.
