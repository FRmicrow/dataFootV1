export const up = async (db) => {
    // V3_System_Preferences additions
    try {
        const tableExists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='V3_System_Preferences'");
        if (tableExists) {
            db.run("ALTER TABLE V3_System_Preferences ADD COLUMN tracked_leagues TEXT DEFAULT '[]'");
        }
    } catch (e) {
        if (!e.message.includes('duplicate column')) throw e;
    }

    // V3_League_Seasons sync flags
    try {
        const tableExists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='V3_League_Seasons'");
        if (tableExists) {
            const leagueSeasonCols = [
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
            ];

            for (const col of leagueSeasonCols) {
                try {
                    db.run(`ALTER TABLE V3_League_Seasons ADD COLUMN ${col.name} ${col.type}`);
                } catch (e) {
                    if (!e.message.includes('duplicate column')) throw e;
                }
            }
        }
    } catch (e) { /* skip if table missing */ }

    // V3_Players additions
    try {
        const tableExists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='V3_Players'");
        if (tableExists) {
            db.run("ALTER TABLE V3_Players ADD COLUMN is_trophy_synced BOOLEAN DEFAULT 0");
            db.run("ALTER TABLE V3_Players ADD COLUMN last_sync_trophies DATETIME");
        }
    } catch (e) { /* skip */ }

    // V3_Leagues additions
    try {
        const tableExists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='V3_Leagues'");
        if (tableExists) {
            db.run("ALTER TABLE V3_Leagues ADD COLUMN is_live_enabled BOOLEAN DEFAULT 0");
        }
    } catch (e) { /* skip */ }

    // V3_Predictions additions
    try {
        const tableExists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='V3_Predictions'");
        if (tableExists) {
            db.run("ALTER TABLE V3_Predictions ADD COLUMN edge_value REAL");
            db.run("ALTER TABLE V3_Predictions ADD COLUMN confidence_score INTEGER");
            db.run("ALTER TABLE V3_Predictions ADD COLUMN risk_level TEXT");
        }
    } catch (e) { /* skip */ }
};
