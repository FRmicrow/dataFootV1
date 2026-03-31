/**
 * Migration 20260401_01 — V4_Club_Logos_Historization
 *
 * Implements historical club logos and normalizes league names.
 */

export const up = async (db) => {
    // 1. Create the historical logos table
    await db.run(`
        CREATE TABLE IF NOT EXISTS V4_Club_Logos (
            id SERIAL PRIMARY KEY,
            team_id INTEGER NOT NULL REFERENCES V4_Teams(team_id) ON DELETE CASCADE,
            logo_url TEXT NOT NULL,
            start_year INTEGER NOT NULL, -- e.g. 1963
            end_year INTEGER,             -- NULL means "until now" or "current"
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Index for performance (team + years)
    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v4_club_logos_team_period 
        ON V4_Club_Logos(team_id, start_year, end_year)
    `);

    // 3. Normalization: Recover 'BundesligaFixtureDetail' as 'Bundesliga'
    await db.run(`
        UPDATE V4_Fixtures 
        SET league = 'Bundesliga' 
        WHERE league = 'BundesligaFixtureDetail'
    `);

    // 4. Initial Migration: Seed with current logos from V4_Teams
    // We assume these are valid from 1900 until now
    await db.run(`
        INSERT INTO V4_Club_Logos (team_id, logo_url, start_year, end_year)
        SELECT team_id, logo_url, 1900, NULL 
        FROM V4_Teams 
        WHERE logo_url IS NOT NULL
        ON CONFLICT DO NOTHING
    `);
};
