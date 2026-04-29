import PlayerImportanceServiceV4 from '../services/v4/PlayerImportanceServiceV4.js';
import db from '../config/database.js';
import logger from '../utils/logger.js';

async function run() {
    try {
        await db.init();
        const result = await PlayerImportanceServiceV4.recalculateAll();
        console.log('Success:', result);
        process.exit(0);
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

run();
