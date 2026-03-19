const createForgeResultsTableIfMissing = async (db) => {
    await db.run(`
        CREATE TABLE IF NOT EXISTS V3_Forge_Results (
            id SERIAL PRIMARY KEY,
            simulation_id INTEGER NOT NULL REFERENCES V3_Forge_Simulations(id) ON DELETE CASCADE,
            fixture_id INTEGER NOT NULL REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
            market_type TEXT NOT NULL DEFAULT 'FT_1X2',
            market_label TEXT,
            model_version TEXT,
            prob_home DOUBLE PRECISION,
            prob_draw DOUBLE PRECISION,
            prob_away DOUBLE PRECISION,
            predicted_score TEXT,
            actual_winner INTEGER,
            is_correct INTEGER,
            edge_value DOUBLE PRECISION,
            retrieved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            predicted_outcome TEXT,
            alternate_outcome TEXT,
            actual_result TEXT,
            primary_probability DOUBLE PRECISION,
            alternate_probability DOUBLE PRECISION,
            actual_numeric_value DOUBLE PRECISION,
            expected_total DOUBLE PRECISION
        )
    `);
};

export const up = async (db) => {
    await createForgeResultsTableIfMissing(db);

    const alterations = [
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS market_type TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS market_label TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS model_version TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS predicted_outcome TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS alternate_outcome TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS actual_result TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS primary_probability DOUBLE PRECISION",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS alternate_probability DOUBLE PRECISION",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS actual_numeric_value DOUBLE PRECISION",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS expected_total DOUBLE PRECISION",
    ];

    for (const sql of alterations) {
        await db.run(sql);
    }

    await db.run(`
        UPDATE V3_Forge_Results
        SET market_type = COALESCE(NULLIF(TRIM(market_type), ''), 'FT_1X2')
    `);

    await db.run(`
        UPDATE V3_Forge_Results
        SET market_label = COALESCE(
            NULLIF(TRIM(market_label), ''),
            CASE COALESCE(NULLIF(TRIM(market_type), ''), 'FT_1X2')
                WHEN 'FT_1X2' THEN 'FT 1X2'
                WHEN 'HT_1X2' THEN 'HT 1X2'
                WHEN 'GOALS_OU' THEN 'Goals O/U'
                WHEN 'CORNERS_OU' THEN 'Corners O/U'
                WHEN 'CARDS_OU' THEN 'Cards O/U'
                ELSE 'FT 1X2'
            END
        )
        WHERE market_label IS NULL OR TRIM(market_label) = ''
    `);

    await db.run(`
        ALTER TABLE V3_Forge_Results
        ALTER COLUMN market_type SET DEFAULT 'FT_1X2'
    `);

    await db.run(`
        ALTER TABLE V3_Forge_Results
        ALTER COLUMN market_type SET NOT NULL
    `);

    await db.run(`
        DO $$
        DECLARE legacy_constraint_name text;
        BEGIN
            FOR legacy_constraint_name IN
                SELECT con.conname
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                WHERE rel.relname = lower('V3_Forge_Results')
                  AND con.contype = 'u'
                  AND (
                      SELECT array_agg(att.attname::text ORDER BY cols.ordinality)
                      FROM unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ordinality)
                      JOIN pg_attribute att
                        ON att.attrelid = rel.oid
                       AND att.attnum = cols.attnum
                  ) = ARRAY['simulation_id', 'fixture_id']::text[]
            LOOP
                EXECUTE format('ALTER TABLE V3_Forge_Results DROP CONSTRAINT %I', legacy_constraint_name);
            END LOOP;
        END $$;
    `);

    await db.run(`
        DO $$
        DECLARE legacy_index_name text;
        BEGIN
            FOR legacy_index_name IN
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = current_schema()
                  AND tablename = lower('V3_Forge_Results')
                  AND indexdef LIKE 'CREATE UNIQUE INDEX%'
                  AND regexp_replace(indexdef, '\\s+', ' ', 'g') ~ '\\(simulation_id, fixture_id\\)$'
            LOOP
                EXECUTE format('DROP INDEX IF EXISTS %I', legacy_index_name);
            END LOOP;
        END $$;
    `);

    await db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_forge_results_sim_fixture_market
        ON V3_Forge_Results(simulation_id, fixture_id, market_type)
    `);

    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_forge_results_sim_market
        ON V3_Forge_Results(simulation_id, market_type)
    `);

    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_forge_results_fixture
        ON V3_Forge_Results(fixture_id)
    `);
};
