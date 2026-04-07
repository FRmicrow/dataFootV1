import 'dotenv/config';
import db from './src/config/database.js';
import MigrationService from './src/services/v3/MigrationService.js';

async function run() {
    await db.init();
    await MigrationService.runPending();
    process.exit();
}

run();
