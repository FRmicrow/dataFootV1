export const up = async (db) => {
    // Check if Import Status and League Seasons exist
    const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='V3_Import_Status' AND table_schema='public'");
    const lsExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='V3_League_Seasons' AND table_schema='public'");

    if (!tableExists || !lsExists) return;

    // Check if Import Status is empty
    const existingCount = await db.get("SELECT COUNT(*) as count FROM V3_Import_Status");

    if (existingCount && existingCount.count === 0) {
        console.log('📋 US_260: Back-populating V3_Import_Status from boolean flags...');
        const seasons = db.all("SELECT * FROM V3_League_Seasons");

        for (const s of seasons) {
            const { league_id, season_year } = s;
            const pillars = [
                {
                    pillar: 'core',
                    status: (s.imported_fixtures && s.imported_standings && s.imported_players) ? 2
                        : (s.imported_fixtures && (!s.imported_standings || !s.imported_players)) ? 1
                            : 0
                },
                { pillar: 'events', status: s.imported_events ? 2 : 0 },
                { pillar: 'lineups', status: s.imported_lineups ? 2 : 0 },
                { pillar: 'trophies', status: s.imported_trophies ? 2 : 0 },
                { pillar: 'fs', status: s.imported_fixture_stats ? 2 : 0 },
                { pillar: 'ps', status: s.imported_player_stats ? 2 : 0 }
            ];

            for (const p of pillars) {
                try {
                    await db.run(`
                        INSERT OR IGNORE INTO V3_Import_Status (league_id, season_year, pillar, status)
                        VALUES (?, ?, ?, ?)
                    `, [league_id, season_year, p.pillar, p.status]);
                } catch (e) { /* unique constraint - skip */ }
            }
        }
        console.log(`✅ US_260: Back-populated status entries from ${seasons.length} seasons.`);
    }
};
