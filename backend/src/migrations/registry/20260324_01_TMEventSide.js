/**
 * Migration V39b — Add side column to V3_Fixture_Events
 *
 * Stores the team side (home/away) for Transfermarkt events which have
 * no team_id but carry a side field in the JSON source.
 * Used by getFixtureEvents to compute is_home_team for TM-sourced events.
 */

export const up = async (db) => {
    await db.run(`
        ALTER TABLE V3_Fixture_Events
        ADD COLUMN IF NOT EXISTS side TEXT
    `);
};
