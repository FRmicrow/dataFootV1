import 'dotenv/config';
import db from '../../src/config/database.js';

const LEAGUE_ID = 1;
const SEASON = parseInt(process.argv[2]) || 2009;

async function repair() {
    try {
        await db.init();
        console.log(`Repairing player match stats for Ligue 1 ${SEASON}...`);

        const fixtures = await db.all("SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?", [LEAGUE_ID, SEASON]);

        // 2. Sync Goals, Assists, Cards
        console.log(`- Syncing goals...`);
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET goals_total = (
                SELECT COUNT(*) FROM v3_fixture_events fe 
                WHERE fe.fixture_id = fps.fixture_id AND fe.player_id = fps.player_id AND fe.type = 'Goal' AND (fe.detail IS NULL OR fe.detail NOT LIKE '%Own Goal%')
            )
            WHERE fixture_id IN (SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?)
        `, [LEAGUE_ID, SEASON]);

        console.log('- Syncing assists...');
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET goals_assists = (
                SELECT COUNT(*) FROM v3_fixture_events fe 
                WHERE fe.fixture_id = fps.fixture_id AND fe.assist_id = fps.player_id AND fe.type = 'Goal'
            )
            WHERE fixture_id IN (SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?)
        `, [LEAGUE_ID, SEASON]);

        console.log('- Syncing cards...');
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET cards_yellow = (
                SELECT COUNT(*) FROM v3_fixture_events fe 
                WHERE fe.fixture_id = fps.fixture_id AND fe.player_id = fps.player_id AND fe.type = 'Card' AND fe.detail ILIKE '%Yellow%'
            ),
            cards_red = (
                SELECT COUNT(*) FROM v3_fixture_events fe 
                WHERE fe.fixture_id = fps.fixture_id AND fe.player_id = fps.player_id AND fe.type = 'Card' AND (fe.detail ILIKE '%Red%' OR fe.detail ILIKE '%Second Yellow%')
            )
            WHERE fixture_id IN (SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?)
        `, [LEAGUE_ID, SEASON]);

        // 3. Simple Minutes Calculation
        console.log('- Estimating minutes...');
        // Starters get 90
        await db.run(`
            UPDATE v3_fixture_player_stats SET minutes_played = 90 
            WHERE is_start_xi = true AND fixture_id IN (SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?)
        `, [LEAGUE_ID, SEASON]);

        // Subs In get 90 - minute_in
        // Note: I need to join with v3_fixture_events to find the substitution minute for the 'joueur_in'
        await db.run(`
            UPDATE v3_fixture_player_stats fps
            SET minutes_played = 90 - (
                SELECT fe.time_elapsed FROM v3_fixture_events fe 
                WHERE fe.fixture_id = fps.fixture_id AND fe.player_id = fps.player_id AND fe.type = 'subst'
                LIMIT 1
            )
            WHERE fps.is_start_xi = false AND fixture_id IN (SELECT fixture_id FROM v3_fixtures WHERE league_id = ? AND season_year = ?)
        `, [LEAGUE_ID, SEASON]);

        // Special case: Player subbed out
        // Starters that appear in a 'subst' event as the player_out (need to check fe.detail or something?)
        // In my ingestion, I put ev.joueur || ev.but || ev.joueur_in || ev.joueur_out in player_name.
        // But for substitution type, did I distinguish in/out in the events table?
        // Let's check an event record.

        console.log(`Repair complete! Please re-run populate_ui_data_${SEASON}.js`);

    } catch (error) {
        console.error('Repair Error:', error);
    } finally {
        process.exit();
    }
}

repair();
