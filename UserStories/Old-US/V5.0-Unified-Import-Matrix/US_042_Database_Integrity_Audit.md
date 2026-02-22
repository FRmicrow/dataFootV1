# US_042: Database Integrity Audit & Discovery Scan

## User Story
**As a** Data Manager  
**I want** a discovery tool to scan the existing database  
**So that** the Import Matrix is accurately populated with the current state of my local data.

## Acceptance Criteria
- **Given** the database contains historical data with missing or null "imported" flags  
- **When** the "Discovery Scan" is triggered  
- **Then** the system must iterate through all `V3_League_Seasons` and perform a cross-check:
    - `imported_fixtures`: Check if `V3_Fixtures` has rows for this league/season.
    - `imported_events`: Check if `V3_Events` exists for the fixtures of this season.
    - `imported_lineups`: Check if `V3_Lineups` exists for the fixtures of this season.
- **When** data is found for a pillar  
- **Then** the system must backfill the `imported_xxx = 1` flag and set `last_sync_xxx` to the current time.
- **Then** the system must return a summary report of all flags updated.

## Functional Notes
- This tool is critical for "First Boot" performance of the new Matrix.
- It prevents the system from re-importing data that was manually imported or imported via legacy V2/V3 tools.

## Technical Notes
- **Performance**: Use optimized SQL `EXISTS` or `COUNT` queries. Do not load full entities into memory.
- **Location**: This should be exposed via a hidden or "Admin Only" button in the Unified Import Hub.
