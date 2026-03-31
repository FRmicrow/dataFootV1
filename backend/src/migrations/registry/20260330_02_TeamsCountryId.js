/**
 * Migration V41 — Universal Schema Hardening (Country IDs)
 *
 * This migration transitions V3_Teams and V3_Team_Aliases from text-based
 * country names to canonical country_id references (INT).
 *
 * This enables the universal ingestion engine to resolve teams exactly
 * within a country's ID scope, preventing name collisions (e.g. Al Hilal).
 */

export const up = async (db) => {
    // 1. Add country_id column to V3_Teams
    await db.run(`
        ALTER TABLE V3_Teams 
        ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES V3_Countries(country_id)
    `);

    // 2. Add country_id column to V3_Team_Aliases
    await db.run(`
        ALTER TABLE V3_Team_Aliases
        ADD COLUMN IF NOT EXISTS country_id INTEGER REFERENCES V3_Countries(country_id)
    `);

    // 3. Backfill V3_Teams.country_id from V3_Teams.country (TEXT)
    console.log('🔄 Backfilling country_id in V3_Teams...');
    await db.run(`
        UPDATE V3_Teams t
        SET country_id = c.country_id
        FROM V3_Countries c
        WHERE lower(t.country) = lower(c.name)
           OR lower(t.country) = lower(c.code)
    `);

    // 4. Update specific mismatches discovered in pilot (Saudi Arabia, etc.)
    await db.run(`UPDATE V3_Teams SET country_id = 7 WHERE country = 'Saudi-Arabia'`);
    await db.run(`UPDATE V3_Teams SET country_id = 5 WHERE country = 'Germany' AND country_id IS NULL`);

    // 5. Backfill V3_Team_Aliases.country_id from parent team
    console.log('🔄 Backfilling country_id in V3_Team_Aliases...');
    await db.run(`
        UPDATE V3_Team_Aliases ta
        SET country_id = t.country_id
        FROM V3_Teams t
        WHERE ta.team_id = t.team_id
          AND t.country_id IS NOT NULL
    `);

    // 6. Create index for fast scoped lookups
    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v3_teams_country_id 
        ON V3_Teams (country_id)
    `);
    
    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v3_team_aliases_country_id 
        ON V3_Team_Aliases (country_id)
    `);

    console.log('✅ Universal Schema Hardening (V41) Complete');
};
