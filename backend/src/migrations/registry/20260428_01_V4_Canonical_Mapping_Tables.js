
import logger from '../../utils/logger.js';

/**
 * Migration 20260428_01 — V4 Canonical Mapping Tables
 * 
 * Creates mapping tables for:
 * - Teams
 * - People
 * - Competitions
 * - Venues
 * 
 * Each table maps a (source, source_id) pair to a canonical internal ID.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Creating Canonical Mapping Tables');

    // 1. Mapping Teams
    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.mapping_teams (
            id            BIGSERIAL PRIMARY KEY,
            source        TEXT NOT NULL,
            source_id     TEXT NOT NULL,
            team_id       BIGINT NOT NULL REFERENCES v4.teams(team_id) ON DELETE CASCADE,
            source_name   TEXT,
            metadata      JSONB DEFAULT '{}',
            created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(source, source_id)
        )
    `);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_teams_tid ON v4.mapping_teams(team_id)`);
    logger.info({}, '✅ Created v4.mapping_teams');

    // 2. Mapping People
    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.mapping_people (
            id            BIGSERIAL PRIMARY KEY,
            source        TEXT NOT NULL,
            source_id     TEXT NOT NULL,
            person_id     BIGINT NOT NULL REFERENCES v4.people(person_id) ON DELETE CASCADE,
            source_name   TEXT,
            metadata      JSONB DEFAULT '{}',
            created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(source, source_id)
        )
    `);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_people_pid ON v4.mapping_people(person_id)`);
    logger.info({}, '✅ Created v4.mapping_people');

    // 3. Mapping Competitions
    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.mapping_competitions (
            id            BIGSERIAL PRIMARY KEY,
            source        TEXT NOT NULL,
            source_id     TEXT NOT NULL,
            competition_id BIGINT NOT NULL REFERENCES v4.competitions(competition_id) ON DELETE CASCADE,
            source_name   TEXT,
            metadata      JSONB DEFAULT '{}',
            created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(source, source_id)
        )
    `);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_competitions_cid ON v4.mapping_competitions(competition_id)`);
    logger.info({}, '✅ Created v4.mapping_competitions');

    // 4. Mapping Venues
    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.mapping_venues (
            id            BIGSERIAL PRIMARY KEY,
            source        TEXT NOT NULL,
            source_id     TEXT NOT NULL,
            venue_id      BIGINT NOT NULL REFERENCES v4.venues(venue_id) ON DELETE CASCADE,
            source_name   TEXT,
            metadata      JSONB DEFAULT '{}',
            created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(source, source_id)
        )
    `);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_mapping_venues_vid ON v4.mapping_venues(venue_id)`);
    logger.info({}, '✅ Created v4.mapping_venues');

    logger.info({}, '🏁 Canonical Mapping Tables migration complete');
};

export const down = async (db) => {
    logger.warn({}, '⏪ Dropping Canonical Mapping Tables');
    await db.run(`DROP TABLE IF EXISTS v4.mapping_venues CASCADE`);
    await db.run(`DROP TABLE IF EXISTS v4.mapping_competitions CASCADE`);
    await db.run(`DROP TABLE IF EXISTS v4.mapping_people CASCADE`);
    await db.run(`DROP TABLE IF EXISTS v4.mapping_teams CASCADE`);
};
