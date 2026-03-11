import 'dotenv/config';
import db from '../../src/config/database.js';
import { runImportJob } from '../../src/services/v3/leagueImportService.js';
import logger from '../../src/utils/logger.js';

async function run() {
    try {
        await db.init();
        logger.info('🚀 Starting Reimport for Bundesliga historical squads...');

        const leagueId = 19; // Local Bundesliga ID
        const seasons = [2014, 2015];

        for (const season of seasons) {
            logger.info(`⚽ Syncing Bundesliga Season ${season} from API-Football...`);
            await runImportJob(leagueId, season, (msg, type) => {
                if (type === 'error') logger.error(msg);
                else logger.info(msg);
            }, { forceRefresh: true });
        }

        logger.info('✅ Finished reimporting historical Bundesliga squads.');
        process.exit(0);
    } catch (err) {
        logger.error('❌ Reimport failed:', err);
        process.exit(1);
    }
}

run();
