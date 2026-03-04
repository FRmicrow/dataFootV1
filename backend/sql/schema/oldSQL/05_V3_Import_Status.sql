-- ============================================
-- V3 Import System Optimization Schema
-- Table: V3_Import_Status
-- Objective: Granular tracking of data pillar completion
-- Version: V13
-- ============================================

-- This table decoupled the "imported" flags from V3_League_Seasons
-- to allow richer state management (NO_DATA, LOCKED, PARTIAL).

CREATE TABLE IF NOT EXISTS V3_Import_Status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Foreign Keys & Targeting
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    
    -- Pillar Type: Each seasonal data category
    pillar TEXT NOT NULL CHECK(pillar IN ('core', 'events', 'lineups', 'trophies', 'fs', 'ps')),
    
    -- Status Enum:
    -- 0: NONE     (Grey)   - Never attempted
    -- 1: PARTIAL  (Orange) - Some data imported, but not all matches/teams
    -- 2: COMPLETE (Green)  - Fully imported for this season
    -- 3: NO_DATA  (Black)  - Explicitly checked and confirmed unavailable by API
    -- 4: LOCKED   (Lock)   - Finalized. No further API calls allowed.
    status INTEGER NOT NULL DEFAULT 0 CHECK(status IN (0, 1, 2, 3, 4)),
    
    -- Error & Failure Tracking
    consecutive_failures INTEGER DEFAULT 0, -- Count of sequential empty API responses
    failure_reason TEXT,                    -- e.g., "10 consecutive empty fixtures reached"
    
    -- Telemetry & Progress
    total_items_expected INTEGER,   -- e.g., total matches in season
    total_items_imported INTEGER DEFAULT 0, -- e.g., matches with events/stats
    
    -- Range Inference (For FS/PS Optimization)
    -- Tracks the valid range where data exists for a league
    data_range_start INTEGER, -- First year data was found
    data_range_end INTEGER,   -- Last year data was found
    
    -- Timestamps
    last_checked_at DATETIME,
    last_success_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id) ON DELETE CASCADE,
    UNIQUE(league_id, season_year, pillar)
);

-- Optimization: Fast lookup for Matrix UI and Batch Logic
CREATE INDEX IF NOT EXISTS idx_import_status_lookup ON V3_Import_Status(league_id, season_year);
CREATE INDEX IF NOT EXISTS idx_import_status_pillar_state ON V3_Import_Status(pillar, status);

-- Trigger to update 'updated_at' on changes
CREATE TRIGGER IF NOT EXISTS trg_v3_import_status_update
AFTER UPDATE ON V3_Import_Status
FOR EACH ROW
BEGIN
    UPDATE V3_Import_Status SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

/* 
   MIGRATION NOTES FOR SQL EXPERT:
   
   Initial back-population should be performed from V3_League_Seasons:
   - imported_fixtures = 1 and imported_standings = 1 => pillar 'core', status 2
   - imported_events = 1 => pillar 'events', status 2
   - imported_lineups = 1 => pillar 'lineups', status 2
   - imported_fixture_stats = 1 => pillar 'fs', status 2
   - imported_player_stats = 1 => pillar 'ps', status 2
   - imported_trophies = 1 => pillar 'trophies', status 2
*/
