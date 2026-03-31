/**
 * Migration V40 — Historical Import Infrastructure
 *
 * Adds three schema improvements needed for the pre-2010 data ingestion pipeline:
 *
 * 1. V3_Import_Log: tracks per (league, season, source) import progress,
 *    enabling the universal importer to RESUME after crashes without re-processing
 *    already-completed seasons.
 *
 * 2. V3_Team_Aliases improvements: adds a `source` column to distinguish
 *    manual whitelists from auto-discovered aliases; adds a unique index on
 *    lower(alias) so lookups are both fast and collision-safe.
 *
 * 3. V3_Player_Aliases: new table enabling post-import fuzzy deduplication.
 *    When TM names and API-Football names differ (e.g. "Ireneusz Jeleń" vs
 *    "I. Jelen"), a canonical mapping is stored here rather than creating
 *    permanent duplicate player rows.
 */

export const up = async (db) => {
    // ──────────────────────────────────────────────
    // 1. V3_Import_Log
    // ──────────────────────────────────────────────
    await db.run(`
        CREATE TABLE IF NOT EXISTS V3_Import_Log (
            log_id           SERIAL PRIMARY KEY,
            league_id        INTEGER NOT NULL,
            season_year      INTEGER NOT NULL,
            source           TEXT NOT NULL DEFAULT 'transfermarkt',
            status           TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','running','done','failed')),
            files_total      INTEGER NOT NULL DEFAULT 0,
            files_ok         INTEGER NOT NULL DEFAULT 0,
            files_skipped    INTEGER NOT NULL DEFAULT 0,
            files_error      INTEGER NOT NULL DEFAULT 0,
            fixtures_created INTEGER NOT NULL DEFAULT 0,
            fixtures_matched INTEGER NOT NULL DEFAULT 0,
            events_imported  INTEGER NOT NULL DEFAULT 0,
            players_imported INTEGER NOT NULL DEFAULT 0,
            started_at       TIMESTAMPTZ,
            completed_at     TIMESTAMPTZ,
            error_detail     TEXT,
            UNIQUE (league_id, season_year, source)
        )
    `);

    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v3_import_log_status
        ON V3_Import_Log (status, league_id, season_year)
    `);

    // ──────────────────────────────────────────────
    // 2. V3_Team_Aliases — deduplicate and add data_source column
    // ──────────────────────────────────────────────
    
    // Add data_source column if missing (v3_team_aliases might already have it)
    await db.run(`
        ALTER TABLE V3_Team_Aliases
        ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'manual'
    `);

    // Before creating unique index, we MUST deduplicate base on lower(alias_name)
    // We keep the record with the LARGEST alias_id in case of collision
    console.log('🧹 Deduplicating V3_Team_Aliases...');
    await db.run(`
        DELETE FROM V3_Team_Aliases t1
        WHERE EXISTS (
            SELECT 1 FROM V3_Team_Aliases t2
            WHERE lower(t2.alias_name) = lower(t1.alias_name)
              AND t2.alias_id > t1.alias_id
        )
    `);

    // Unique index on lower(alias_name) for fast O(1) lookups without case collisions
    await db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_team_aliases_alias_name_lower
        ON V3_Team_Aliases ((lower(alias_name)))
    `);

    // ──────────────────────────────────────────────
    // 3. V3_Player_Aliases
    // ──────────────────────────────────────────────
    await db.run(`
        CREATE TABLE IF NOT EXISTS V3_Player_Aliases (
            alias_id   SERIAL PRIMARY KEY,
            player_id  INTEGER NOT NULL REFERENCES V3_Players(player_id) ON DELETE CASCADE,
            alias_name TEXT NOT NULL,
            data_source TEXT NOT NULL DEFAULT 'transfermarkt',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v3_player_aliases_player
        ON V3_Player_Aliases (player_id)
    `);

    // Functional index for fast case-insensitive alias lookups
    await db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_player_aliases_alias_name_lower
        ON V3_Player_Aliases ((lower(alias_name)))
    `);
};
