export const up = async (db) => {
    const audit = [
        {
            table: 'V3_Leagues',
            columns: [
                { name: 'importance_rank', type: 'INTEGER DEFAULT 999' },
                { name: 'is_live_enabled', type: 'BOOLEAN DEFAULT FALSE' }
            ]
        },
        {
            table: 'V3_Players',
            columns: [
                { name: 'is_trophy_synced', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'last_sync_trophies', type: 'TIMESTAMPTZ' },
                { name: 'position', type: 'TEXT' },
                { name: 'scout_rank', type: 'REAL' }
            ]
        },
        {
            table: 'V3_Teams',
            columns: [
                { name: 'scout_rank', type: 'REAL' }
            ]
        },
        {
            table: 'V3_Player_Stats',
            columns: [
                { name: 'games_position', type: 'TEXT' }
            ]
        },
        {
            table: 'V3_League_Seasons',
            columns: [
                { name: 'imported_events', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'imported_lineups', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'imported_trophies', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'last_sync_core', type: 'TIMESTAMPTZ' },
                { name: 'last_sync_events', type: 'TIMESTAMPTZ' },
                { name: 'last_sync_lineups', type: 'TIMESTAMPTZ' },
                { name: 'last_sync_trophies', type: 'TIMESTAMPTZ' },
                { name: 'coverage_fixtures', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'last_updated', type: 'TIMESTAMPTZ' },
                { name: 'imported_fixture_stats', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'imported_player_stats', type: 'BOOLEAN DEFAULT FALSE' },
                { name: 'last_sync_fixture_stats', type: 'TIMESTAMPTZ' },
                { name: 'last_sync_player_stats', type: 'TIMESTAMPTZ' }
            ]
        },
        {
            table: 'V3_System_Preferences',
            columns: [
                { name: 'tracked_leagues', type: "TEXT DEFAULT '[]'" }
            ]
        },
        {
            table: 'V3_Predictions',
            columns: [
                { name: 'edge_value', type: 'REAL' },
                { name: 'confidence_score', type: 'INTEGER' },
                { name: 'risk_level', type: 'TEXT' }
            ]
        }
    ];

    console.log('🧐 Starting Comprehensive Schema Audit...');

    // 0. Ensure Missing Tables exist
    const tablesToCreate = [
        {
            name: 'V3_System_Preferences',
            sql: `CREATE TABLE IF NOT EXISTS V3_System_Preferences (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                favorite_leagues JSON DEFAULT '[]',
                favorite_teams JSON DEFAULT '[]'
            )`
        },
        {
            name: 'V3_Feature_Snapshots',
            sql: `CREATE TABLE IF NOT EXISTS V3_Feature_Snapshots (
                id SERIAL PRIMARY KEY,
                fixture_id INTEGER NOT NULL,
                team_id INTEGER NOT NULL,
                feature_type TEXT NOT NULL,
                feature_data JSON NOT NULL,
                snapshot_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(fixture_id, team_id, feature_type)
            )`
        },
        {
            name: 'V3_Predictions',
            sql: `CREATE TABLE IF NOT EXISTS V3_Predictions (
                id SERIAL PRIMARY KEY,
                fixture_id INTEGER NOT NULL UNIQUE,
                league_id INTEGER,
                season TEXT,
                winner_id INTEGER,
                winner_name TEXT,
                winner_comment TEXT,
                prob_home TEXT,
                prob_draw TEXT,
                prob_away TEXT,
                goals_home INTEGER,
                goals_away INTEGER,
                advice TEXT,
                comparison_data JSON,
                h2h_data JSON,
                teams_data JSON,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )`
        }
    ];

    for (const t of tablesToCreate) {
        try {
            await db.run(t.sql);
            console.log(`  ✅ Ensured table ${t.name} exists.`);
        } catch (e) {
            console.error(`  ❌ Error ensuring table ${t.name}:`, e.message);
        }
    }

    for (const item of audit) {
        try {
            const tableName = item.table.toLowerCase();
            const tableExists = await db.get(`SELECT table_name FROM information_schema.tables WHERE table_name='${tableName}' AND table_schema='public'`);
            if (!tableExists) {
                console.log(`  ⚠️ Table ${item.table} (searched as ${tableName}) missing, skipping column audit.`);
                continue;
            }

            for (const col of item.columns) {
                try {
                    await db.run(`ALTER TABLE ${item.table} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                    console.log(`  ✅ Ensured column ${col.name} exists in ${item.table}`);
                } catch (e) {
                    if (e.message.includes('already exists')) {
                        // All good
                    } else {
                        console.error(`  ❌ Error adding ${col.name} to ${item.table}:`, e.message);
                    }
                }
            }
        } catch (e) {
            console.error(`  ❌ Critical audit error for ${item.table}:`, e.message);
        }
    }

    console.log('🎉 Schema Audit complete.');
};
