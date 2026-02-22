# US_041: Smart Idempotent Import Engine & Persistence

## User Story
**As a** System  
**I want** to enforce strict idempotency using "Imported" flags and "Last Sync" timestamps  
**So that** I avoid redundant API calls and ensure data consistency.

## Acceptance Criteria
- **Given** an import request for a specific data pillar (Core, Events, Lineups, or Trophies)  
- **When** the engine processes a record (Match or Player)  
- **Then** it must check the corresponding `imported_xxx` flag or `is_trophy_synced` flag **before** making external API requests.
- **Given** a player career trophy sync  
- **When** the player is discovered in any league/season  
- **If** `V3_Players.is_trophy_synced = 1`  
- **Then** skip the trophy API call.
- **Given** a successful batch import for a pillar  
- **When** the database transaction is committed  
- **Then** the system must update the `V3_League_Seasons` table:
    - Set `imported_[pillar_name] = 1`.
    - Set `last_sync_[pillar_name] = CURRENT_TIMESTAMP`.

## Functional Notes
- "Core" data (Standings/Fixtures) must be imported before "Events" or "Lineups" can be requested.
- If a "Force Refresh" flag is passed in the request, the system should ignore the `imported_xxx` flag and overwrite data.

## Technical Notes
- **Database Schema Updates Needed**:
    - `V3_League_Seasons`: Add `last_sync_core`, `last_sync_events`, `last_sync_lineups`, `last_sync_trophies` (DATETIME).
    - `V3_Players`: Ensure `last_sync_trophies` is present and utilized.
- **Atomic Operations**: Ensure flag updates and sync timestamps are part of the same transaction as the data import.
