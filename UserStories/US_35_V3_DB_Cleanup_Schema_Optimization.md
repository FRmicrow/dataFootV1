# US_35_V3_DB_Cleanup_Schema_Optimization

## 1. User Story
**As a** Database Expert,
**I want to** create a history schema for data cleanup and optimize the V3 tables for integrity checks,
**So that** we can perform large-scale deletions safely and quickly.

## 2. Technical Context
- **Target DB**: SQLite (`database_v3_test.sqlite`).
- **New Table**: `V3_Cleanup_History`.

## 3. Implementation Requirements

### 3.1 Cleanup History Table
Create a table to store any row deleted during the integrity checks.
- **Columns**:
    -   `id` (PK)
    -   `group_id` (UUID/TEXT) - To group deletions from a single "Fix All" action.
    -   `table_name` (TEXT) - e.g., 'V3_Player_Stats'.
    -   `original_pk_id` (INTEGER) - The ID the record had in the source table.
    -   `raw_data` (JSON/TEXT) - The full JSON representation of the deleted row.
    -   `deleted_at` (DATETIME DEFAULT CURRENT_TIMESTAMP).
    -   `reason` (TEXT) - e.g., 'Duplicate Stat', 'Orphan Trophy'.

### 3.2 Performance Optimization
To facilitate the "Discovery" of duplicates across 10,000+ rows:
- **Index**: Ensure composite indexes exist on `(player_id, team_id, league_id, season_year)` for `V3_Player_Stats`.
- **Index**: Ensure index on `V3_Leagues(name, country_id)` for collision checks.

### 3.3 Integrity Enforcement (Future Prep)
- Verify that `V3_Trophies.player_id` is indexed to speed up the orphan check `LEFT JOIN ... WHERE V3_Players.player_id IS NULL`.

## 4. Acceptance Criteria
- [x] `V3_Cleanup_History` table exists and is ready to receive archived data.
- [x] Composite indexes created to prevent slow table scans during health checks.
- [x] Schema documentation updated with the new History table details.
