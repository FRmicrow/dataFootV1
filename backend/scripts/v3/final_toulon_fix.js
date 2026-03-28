import db from '../../src/config/database.js';

const TABLES = [
    { table: 'v3_fixtures', cols: ['home_team_id', 'away_team_id'] },
    { table: 'v3_fixture_lineups', cols: ['team_id'], conflict: ['fixture_id'] },
    { table: 'v3_fixture_player_stats', cols: ['team_id'], conflict: ['fixture_id', 'player_id'] },
    { table: 'v3_fixture_events', cols: ['team_id'] },
    { table: 'v3_player_stats', cols: ['team_id'], conflict: ['player_id', 'league_id', 'season_year'] },
    { table: 'v3_player_season_stats', cols: ['team_id'], conflict: ['player_id', 'league_id', 'season_year'] },
    { table: 'v3_standings', cols: ['team_id'], conflict: ['league_id', 'season_year'] },
    { table: 'ml_matches', cols: ['home_team', 'away_team'] },
    { table: 'v3_team_aliases', cols: ['team_id'] },
    { table: 'v3_team_features_prematch', cols: ['team_id'], conflict: ['fixture_id', 'feature_set_id', 'horizon_type'] }
];

async function fix() {
    await db.init();
    console.log('--- FINAL TOULON & BORDEAUX LOGO REPAIR ---');

    const TOULON_BAD = 18855;
    const TOULON_CANONICAL = 1355;

    console.log(`Merging Toulon ${TOULON_BAD} -> ${TOULON_CANONICAL}`);
    for (const t of TABLES) {
        for (const col of t.cols) {
            try {
                if (t.conflict) {
                    const whereClause = t.conflict.map(c => `t1.${c} = t2.${c}`).join(' AND ');
                    await db.run(`DELETE FROM ${t.table} t1 WHERE t1.${col} = $1 AND EXISTS (SELECT 1 FROM ${t.table} t2 WHERE t2.${col} = $2 AND ${whereClause})`, [TOULON_BAD, TOULON_CANONICAL]);
                }
                await db.run(`UPDATE ${t.table} SET ${col} = $1 WHERE ${col} = $2`, [TOULON_CANONICAL, TOULON_BAD]);
            } catch (e) {}
        }
    }
    
    // Set Toulon Canonical
    await db.run("UPDATE v3_teams SET name = 'Toulon', data_source = 'api-sports' WHERE team_id = $1", [TOULON_CANONICAL]);
    await db.run("UPDATE v3_teams SET data_source = 'retired' WHERE team_id = $1", [TOULON_BAD]);

    // Bordeaux Audit (Double Check)
    console.log('Finalizing Bordeaux ID 2 Consistency...');
    const bordeaux_dups = [18727, 21550, 18795];
    for (const dup of bordeaux_dups) {
        for (const t of TABLES) {
            for (const col of t.cols) {
                try {
                    if (t.conflict) {
                        const whereClause = t.conflict.map(c => `t1.${c} = t2.${c}`).join(' AND ');
                        await db.run(`DELETE FROM ${t.table} t1 WHERE t1.${col} = $1 AND EXISTS (SELECT 1 FROM ${t.table} t2 WHERE t2.${col} = $2 AND ${whereClause})`, [dup, 2]);
                    }
                    await db.run(`UPDATE ${t.table} SET ${col} = $1 WHERE ${col} = $2`, [2, dup]);
                } catch (e) {}
            }
        }
    }

    console.log('--- REPAIR COMPLETE ---');
    process.exit(0);
}

fix();
