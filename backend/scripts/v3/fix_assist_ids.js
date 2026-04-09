import 'dotenv/config';
import db from '../../src/config/database.js';

const LEAGUE_ID = 1;
const SEASON = parseInt(process.argv[2]) || 2009;

async function fixAssistIds() {
    try {
        await db.init();
        console.log(`Fixing assist_id and player_id mappings in v3_fixture_events for 2009...`);

        // 1. Re-map assist_id from assist_name using a bulk SQL JOIN
        console.log('- Re-mapping assist_id from assist_name (bulk)...');
        const assistResult = await db.run(`
            UPDATE v3_fixture_events fe
            SET assist_id = p.player_id
            FROM v3_players p
            WHERE fe.assist_name = p.name
            AND fe.assist_id IS NULL
            AND fe.assist_name IS NOT NULL
            AND fe.fixture_id IN (SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?)
        `, [LEAGUE_ID, SEASON]);
        console.log(`  Done: ${assistResult.changes ?? 'N/A'} rows updated`);

        // 2. Also fix player_id from player_name for Goal events (bulk)
        console.log('- Re-mapping player_id from player_name for goal events (bulk)...');
        const goalResult = await db.run(`
            UPDATE v3_fixture_events fe
            SET player_id = p.player_id
            FROM v3_players p
            WHERE fe.player_name = p.name
            AND fe.player_id IS NULL
            AND fe.type = 'Goal'
            AND fe.fixture_id IN (SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?)
        `, [LEAGUE_ID, SEASON]);
        console.log(`  Done: ${goalResult.changes ?? 'N/A'} rows updated`);

        // 3. Re-sync goals & assists
        console.log('\n- Re-syncing goals...');
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET goals_total = (
                SELECT COUNT(*) FROM v3_fixture_events fe 
                WHERE fe.fixture_id = fps.fixture_id AND fe.player_id = fps.player_id 
                AND fe.type = 'Goal' AND (fe.detail IS NULL OR fe.detail NOT ILIKE '%Own%')
            )
            WHERE fixture_id IN (SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?)
        `, [LEAGUE_ID, SEASON]);

        console.log('- Re-syncing assists...');
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET goals_assists = (
                SELECT COUNT(*) FROM v3_fixture_events fe 
                WHERE fe.fixture_id = fps.fixture_id AND fe.assist_id = fps.player_id AND fe.type = 'Goal'
            )
            WHERE fixture_id IN (SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?)
        `, [LEAGUE_ID, SEASON]);

        console.log('Fix complete!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

fixAssistIds();
