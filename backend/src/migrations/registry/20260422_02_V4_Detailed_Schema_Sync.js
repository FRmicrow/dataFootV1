import logger from '../../utils/logger.js';

export const up = async (db) => {
    logger.info({}, '🚀 Starting Detailed Schema Sync for V4');

    // 1. Create v4.venues
    await db.run(`
        CREATE TABLE IF NOT EXISTS v4.venues (
            venue_id BIGINT PRIMARY KEY,
            name TEXT NOT NULL,
            country_id BIGINT REFERENCES v4.countries(country_id),
            capacity INTEGER,
            source_url TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);

    // 2. Update v4.matches
    await db.run(`
        ALTER TABLE v4.matches 
        ADD COLUMN IF NOT EXISTS source_provider TEXT,
        ADD COLUMN IF NOT EXISTS source_match_id TEXT,
        ADD COLUMN IF NOT EXISTS source_file TEXT,
        ADD COLUMN IF NOT EXISTS source_url TEXT,
        ADD COLUMN IF NOT EXISTS source_title TEXT,
        ADD COLUMN IF NOT EXISTS source_dataset TEXT,
        ADD COLUMN IF NOT EXISTS source_competition_key TEXT,
        ADD COLUMN IF NOT EXISTS date_label TEXT,
        ADD COLUMN IF NOT EXISTS round_label TEXT,
        ADD COLUMN IF NOT EXISTS matchday INTEGER,
        ADD COLUMN IF NOT EXISTS kickoff_time TEXT,
        ADD COLUMN IF NOT EXISTS venue_id BIGINT REFERENCES v4.venues(venue_id),
        ADD COLUMN IF NOT EXISTS attendance INTEGER,
        ADD COLUMN IF NOT EXISTS referee_person_id BIGINT REFERENCES v4.people(person_id),
        ADD COLUMN IF NOT EXISTS home_formation TEXT,
        ADD COLUMN IF NOT EXISTS away_formation TEXT
    `);

    // 3. Update v4.match_events
    await db.run(`
        ALTER TABLE v4.match_events 
        ADD COLUMN IF NOT EXISTS club_id BIGINT REFERENCES v4.clubs(club_id),
        ADD COLUMN IF NOT EXISTS player_source_tm_id TEXT,
        ADD COLUMN IF NOT EXISTS related_player_source_tm_id TEXT,
        ADD COLUMN IF NOT EXISTS player_source_url TEXT,
        ADD COLUMN IF NOT EXISTS related_player_source_url TEXT,
        ADD COLUMN IF NOT EXISTS club_source_url TEXT,
        ADD COLUMN IF NOT EXISTS assist_type TEXT,
        ADD COLUMN IF NOT EXISTS reason TEXT
    `);

    // 4. Update v4.match_lineups
    await db.run(`
        ALTER TABLE v4.match_lineups 
        ADD COLUMN IF NOT EXISTS source_player_key TEXT,
        ADD COLUMN IF NOT EXISTS player_source_tm_id TEXT,
        ADD COLUMN IF NOT EXISTS player_source_url TEXT,
        ADD COLUMN IF NOT EXISTS position_top_pct NUMERIC,
        ADD COLUMN IF NOT EXISTS position_left_pct NUMERIC
    `);

    logger.info({}, '✅ Detailed Schema Sync complete');
};

export const down = async (db) => {
    await db.run('DROP TABLE IF EXISTS v4.venues CASCADE');
};
