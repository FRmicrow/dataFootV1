/**
 * Migration 20260331_03 — V4 Baseline Schema
 * 
 * Re-creating structured models for Transfermarkt historical data (V4).
 * Completely isolated from V3.
 */

export const up = async (db) => {
    // 1. V4_Teams
    await db.run(`CREATE TABLE IF NOT EXISTS V4_Teams (
        team_id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        logo_url TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. V4_Players
    await db.run(`CREATE TABLE IF NOT EXISTS V4_Players (
        player_id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. V4_Fixtures
    await db.run(`CREATE TABLE IF NOT EXISTS V4_Fixtures (
        fixture_id SERIAL PRIMARY KEY,
        tm_match_id TEXT UNIQUE, -- Original Transfermarkt match ID
        season TEXT,
        league TEXT,
        date TIMESTAMPTZ,
        home_team_id INTEGER REFERENCES V4_Teams(team_id) ON DELETE CASCADE,
        away_team_id INTEGER REFERENCES V4_Teams(team_id) ON DELETE CASCADE,
        goals_home INTEGER,
        goals_away INTEGER,
        round TEXT,
        venue TEXT,
        attendance INTEGER,
        referee TEXT,
        metadata_json JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);

    // 4. V4_Fixture_Events
    await db.run(`CREATE TABLE IF NOT EXISTS V4_Fixture_Events (
        id SERIAL PRIMARY KEY,
        fixture_id INTEGER NOT NULL REFERENCES V4_Fixtures(fixture_id) ON DELETE CASCADE,
        time_elapsed INTEGER NOT NULL,
        type TEXT NOT NULL, -- 'Goal', 'Card', 'Subst', etc.
        player_id INTEGER REFERENCES V4_Players(player_id) ON DELETE SET NULL,
        assist_id INTEGER REFERENCES V4_Players(player_id) ON DELETE SET NULL,
        detail TEXT,
        score_at_event TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. V4_Fixture_Lineups
    await db.run(`CREATE TABLE IF NOT EXISTS V4_Fixture_Lineups (
        id SERIAL PRIMARY KEY,
        fixture_id INTEGER NOT NULL REFERENCES V4_Fixtures(fixture_id) ON DELETE CASCADE,
        player_id INTEGER NOT NULL REFERENCES V4_Players(player_id) ON DELETE CASCADE,
        team_id INTEGER NOT NULL REFERENCES V4_Teams(team_id) ON DELETE CASCADE,
        side TEXT NOT NULL CHECK (side IN ('home', 'away')),
        is_starter BOOLEAN DEFAULT FALSE,
        position_code TEXT, -- G, D, M, A
        numero TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )`);

    // 6. Indices for performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_v4_fixtures_tm_id ON V4_Fixtures(tm_match_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_v4_fixtures_date ON V4_Fixtures(date)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_v4_fixtures_teams ON V4_Fixtures(home_team_id, away_team_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_v4_fixture_events_fixture ON V4_Fixture_Events(fixture_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_v4_fixture_lineups_fixture ON V4_Fixture_Lineups(fixture_id)');
};
