
import db from '../../src/config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import TransfermarktScraperService from '../../src/services/v4/TransfermarktScraperService.js';
import logger from '../../src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    const competitionName = process.argv[2] || 'Super League 1';
    const limit = parseInt(process.argv[3]) || 1000;

    try {
        await db.init();
        
        const c = await db.get("SELECT competition_id FROM v4.competitions WHERE name = $1", [competitionName]);
        if (!c) {
            logger.error({ competitionName }, 'Competition not found');
            process.exit(1);
        }

        logger.info({ competitionName, limit }, `🚀 Starting recovery batch...`);
        const result = await TransfermarktScraperService.recoverMissingDates(c.competition_id, limit);
        
        logger.info(result, '✅ Batch complete');
        process.exit(0);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}

main();
