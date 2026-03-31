import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'cleanup_season' });

const getArg = (name) => {
    const idx = process.argv.indexOf(name);
    return idx !== -1 ? process.argv[idx + 1] : null;
};

const LEAGUE_ID = parseInt(getArg('--league'));
const SEASON_YEAR = parseInt(getArg('--season'));

if (!LEAGUE_ID || !SEASON_YEAR) {
    console.log('Usage: node cleanup_season.js --league <id> --season <year>');
    process.exit(1);
}

async function runCleanup() {
    try {
        await db.init();
        log.info({ leagueId: LEAGUE_ID, season: SEASON_YEAR }, 'Starting cleanup for season');

        const fixtures = await db.all(
            "SELECT fixture_id FROM V3_Fixtures WHERE league_id = $1 AND season_year = $2",
            [LEAGUE_ID, SEASON_YEAR]
        );

        if (fixtures.length === 0) {
            log.warn('No fixtures found for this season');
            return;
        }

        const ids = fixtures.map(f => f.fixture_id).join(',');

        log.info(`Cleaning ${fixtures.length} fixtures...`);

        // 1. Delete Stats
        const stats = await db.run(`DELETE FROM V3_Fixture_Player_Stats WHERE fixture_id IN (${ids})`);
        log.info({ deleted: stats.changes }, 'Deleted player stats');

        // 2. Delete Lineups
        const lineups = await db.run(`DELETE FROM V3_Fixture_Lineups WHERE fixture_id IN (${ids})`);
        log.info({ deleted: lineups.changes }, 'Deleted lineups');

        // 3. Delete Transfermarkt Events
        const events = await db.run(`DELETE FROM V3_Fixture_Events WHERE fixture_id IN (${ids}) AND data_source = 'transfermarkt'`);
        log.info({ deleted: events.changes }, 'Deleted TM events');

        log.info('Cleanup completed successfully');

    } catch (error) {
        log.error({ err: error }, 'Cleanup failed');
    } finally {
        process.exit();
    }
}

runCleanup();
