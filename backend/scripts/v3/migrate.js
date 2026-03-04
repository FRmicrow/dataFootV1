import 'dotenv/config';
import db from '../../src/config/database.js';
import MigrationService from '../../src/services/v3/MigrationService.js';

async function runMigrations() {
    try {
        console.log('🚀 Starting V3 Migrations...');
        await db.init();
        await MigrationService.runPending();
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();
