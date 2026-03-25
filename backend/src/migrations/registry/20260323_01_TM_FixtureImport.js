/**
 * Migration V39 — Transfermarkt Fixture Import
 *
 * Changes:
 * - V3_Fixtures: make api_id nullable (for TM-only fixtures), add data_source, tm_match_id, home/away_logo_url
 * - V3_Fixture_Events: add data_source
 * - V3_Teams: add data_source
 */

export const up = async (db) => {
    // 1. Drop NOT NULL constraint on api_id (TM fixtures have no API-Football ID)
    await db.run(`
        ALTER TABLE V3_Fixtures
        ALTER COLUMN api_id DROP NOT NULL
    `);

    // 2. Drop the old UNIQUE constraint on api_id (which doesn't allow multiple NULLs gracefully)
    //    Use dynamic lookup in case the constraint name differs between environments
    await db.run(`
        DO $$
        DECLARE legacy_constraint_name text;
        BEGIN
            FOR legacy_constraint_name IN
                SELECT con.conname
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                WHERE rel.relname = lower('V3_Fixtures')
                  AND con.contype = 'u'
                  AND (
                      SELECT array_agg(att.attname::text ORDER BY cols.ordinality)
                      FROM unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ordinality)
                      JOIN pg_attribute att
                        ON att.attrelid = rel.oid
                       AND att.attnum = cols.attnum
                  ) = ARRAY['api_id']::text[]
            LOOP
                EXECUTE format('ALTER TABLE V3_Fixtures DROP CONSTRAINT %I', legacy_constraint_name);
            END LOOP;
        END $$;
    `);

    // 3. Replace with a partial UNIQUE index (only enforces uniqueness when api_id IS NOT NULL)
    await db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_fixtures_api_id_notnull
        ON V3_Fixtures(api_id)
        WHERE api_id IS NOT NULL
    `);

    // 4. Add data traceability columns to V3_Fixtures
    const fixtureAlterations = [
        "ALTER TABLE V3_Fixtures ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'api-sports'",
        "ALTER TABLE V3_Fixtures ADD COLUMN IF NOT EXISTS tm_match_id TEXT",
        "ALTER TABLE V3_Fixtures ADD COLUMN IF NOT EXISTS home_logo_url TEXT",
        "ALTER TABLE V3_Fixtures ADD COLUMN IF NOT EXISTS away_logo_url TEXT",
    ];

    for (const sql of fixtureAlterations) {
        await db.run(sql);
    }

    // 5. Unique index on tm_match_id (only when set)
    await db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_fixtures_tm_match_id
        ON V3_Fixtures(tm_match_id)
        WHERE tm_match_id IS NOT NULL
    `);

    // 6. Composite index for TM fixture lookups by team + date
    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v3_fixtures_teams_date
        ON V3_Fixtures(home_team_id, away_team_id, date)
    `);

    // 7. Traceability on V3_Fixture_Events
    await db.run(`
        ALTER TABLE V3_Fixture_Events
        ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'api-sports'
    `);

    // 8. Traceability on V3_Teams
    await db.run(`
        ALTER TABLE V3_Teams
        ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'api-sports'
    `);
};
