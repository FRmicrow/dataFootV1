export const up = async (db) => {
    // V3_System_Preferences additions
    try {
        const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='v3_system_preferences' AND table_schema='public'");
        if (tableExists) {
            await db.run("ALTER TABLE V3_System_Preferences ADD COLUMN IF NOT EXISTS tracked_leagues TEXT DEFAULT '[]'");
        }
    } catch (e) {
        if (!e.message.includes('already exists')) throw e;
    }

    // V3_League_Seasons sync flags
    try {
        const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='v3_league_seasons' AND table_schema='public'");
        if (tableExists) {
            const leagueSeasonCols = [
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
            ];

            for (const col of leagueSeasonCols) {
                try {
                    await db.run(`ALTER TABLE V3_League_Seasons ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
                } catch (e) {
                    if (!e.message.includes('already exists')) throw e;
                }
            }
        }
    } catch (e) { /* skip if table missing */ }

    // V3_Players additions
    try {
        const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='v3_players' AND table_schema='public'");
        if (tableExists) {
            await db.run("ALTER TABLE V3_Players ADD COLUMN IF NOT EXISTS is_trophy_synced BOOLEAN DEFAULT FALSE");
            await db.run("ALTER TABLE V3_Players ADD COLUMN IF NOT EXISTS last_sync_trophies TIMESTAMPTZ");
        }
    } catch (e) { /* skip */ }

    // V3_Leagues additions
    try {
        const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='v3_leagues' AND table_schema='public'");
        if (tableExists) {
            await db.run("ALTER TABLE V3_Leagues ADD COLUMN IF NOT EXISTS is_live_enabled BOOLEAN DEFAULT FALSE");
        }
    } catch (e) { /* skip */ }

    // V3_Predictions additions
    try {
        const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='v3_predictions' AND table_schema='public'");
        if (tableExists) {
            await db.run("ALTER TABLE V3_Predictions ADD COLUMN IF NOT EXISTS edge_value REAL");
            await db.run("ALTER TABLE V3_Predictions ADD COLUMN IF NOT EXISTS confidence_score INTEGER");
            await db.run("ALTER TABLE V3_Predictions ADD COLUMN IF NOT EXISTS risk_level TEXT");
        }
    } catch (e) { /* skip */ }
};
