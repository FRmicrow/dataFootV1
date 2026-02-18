# US_35_V3_BE_DB_Integrity_Deep_Clean

## 1. User Story
**As a** Backend Developer,
**I want to** implement an advanced health/cleanup system for the V3 database,
**So that** we can eliminate performance-draining duplicates and ensure logical consistency across leagues, players, and trophies.

## 2. Technical Context
- **Target Logic**: `adminController.js` (Backend).
- **Primary Data Targets**: `V3_Leagues`, `V3_Player_Stats`, `V3_Trophies`.
- **Constraint**: All destructive actions must be logged for potential "Revert".

## 3. Implementation Requirements

### 3.1 League Naming Collision Handler
- **Trigger**: When multiple `league_id` (different API IDs) share the exact same `name`.
- **Action**: Rename entries to include their country context.
- **Format**: `[Original Name] ([Country Name])`.
- **Logic**: Fetch the `country_name` using `country_id` from `V3_Countries` and update `V3_Leagues.name`.

### 3.2 Advanced Duplicate Detection
Refine the current duplication logic specifically for `V3_Player_Stats`:
- **Rules of Duplication**:
    -   **Duplicated**: If `player_id`, `team_id`, `league_id`, AND `season_year` are identical.
    -   **Valid (NOT Duplicate)**: If `player_id`, `team_id`, and `season_year` are identical BUT `league_id` is different (e.g., Player playing in Ligue 1 AND Coupe de France for PSG in 2023).
- **Cleanup Strategy**:
    -   Keep the record with higher `stat_id` (newest).
    -   Delete the redundant entries.

### 3.3 Integrity Check: "Relational Orphans"
Identify and handle broken links:
- **Trophies**: Delete entries in `V3_Trophies` where `player_id` does not exist in `V3_Players`.
- **Stats**: Delete entries in `V3_Player_Stats` where `player_id` or `league_id` is null or missing from parent tables.
- **Nationality Soft-Match**: Flag (but do not delete) players whose `nationality` string does not have a matching `name` in `V3_Countries`.

### 3.4 Revert Mechanism (Safety First)
- **Archive Before Delete**: Before any `DELETE` operation, insert the full record into a new `V3_Cleanup_History` table (see SQL US).
- **Log ID**: Group each cleanup session by a `cleanup_group_id` (UUID).
- **Revert Endpoint**: `POST /api/v3/admin/health/revert/:group_id` - Restores all deleted records from the history table for that specific session.

## 4. Acceptance Criteria
- [x] **Leagues**: Colliding league names are renamed with parenthesized country names.
- [x] **Stats**: Intra-league duplicates are removed, while Inter-league (League/Cup) entries are preserved.
- [x] **Cleanup**: Orphans are purged from the database.
- [x] **Safety**: Every deletion is recorded in history and can be reverted by a developer via API.
