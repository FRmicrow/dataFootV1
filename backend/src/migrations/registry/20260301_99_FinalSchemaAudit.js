export const up = async (db) => {
    const audit = [
        {
            table: 'V3_Leagues',
            columns: [
                { name: 'importance_rank', type: 'INTEGER DEFAULT 999' },
                { name: 'is_live_enabled', type: 'BOOLEAN DEFAULT 0' }
            ]
        },
        {
            table: 'V3_Players',
            columns: [
                { name: 'is_trophy_synced', type: 'BOOLEAN DEFAULT 0' },
                { name: 'last_sync_trophies', type: 'DATETIME' },
                { name: 'position', type: 'TEXT' }
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
                { name: 'imported_events', type: 'BOOLEAN DEFAULT 0' },
                { name: 'imported_lineups', type: 'BOOLEAN DEFAULT 0' },
                { name: 'imported_trophies', type: 'BOOLEAN DEFAULT 0' },
                { name: 'last_sync_core', type: 'DATETIME' },
                { name: 'last_sync_events', type: 'DATETIME' },
                { name: 'last_sync_lineups', type: 'DATETIME' },
                { name: 'last_sync_trophies', type: 'DATETIME' },
                { name: 'coverage_fixtures', type: 'BOOLEAN DEFAULT 0' },
                { name: 'last_updated', type: 'DATETIME' },
                { name: 'imported_fixture_stats', type: 'BOOLEAN DEFAULT 0' },
                { name: 'imported_player_stats', type: 'BOOLEAN DEFAULT 0' },
                { name: 'last_sync_fixture_stats', type: 'DATETIME' },
                { name: 'last_sync_player_stats', type: 'DATETIME' }
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
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fixture_id INTEGER NOT NULL,
                team_id INTEGER NOT NULL,
                feature_type TEXT NOT NULL,
                feature_data JSON NOT NULL,
                snapshot_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(fixture_id, team_id, feature_type)
            )`
        },
        {
            name: 'V3_Predictions',
            sql: `CREATE TABLE IF NOT EXISTS V3_Predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        }
    ];

    for (const t of tablesToCreate) {
        try {
            db.run(t.sql);
            console.log(`  ✅ Ensured table ${t.name} exists.`);
        } catch (e) {
            console.error(`  ❌ Error ensuring table ${t.name}:`, e.message);
        }
    }

    for (const item of audit) {
        try {
            const tableExists = db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${item.table}'`);
            if (!tableExists) {
                console.log(`  ⚠️ Table ${item.table} missing, skipping column audit.`);
                continue;
            }

            for (const col of item.columns) {
                try {
                    db.run(`ALTER TABLE ${item.table} ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`  ✅ Added column ${col.name} to ${item.table}`);
                } catch (e) {
                    if (e.message.includes('duplicate column')) {
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
