
import MaintenanceServiceV4 from './src/services/v4/MaintenanceServiceV4.js';
import db from './src/config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function runDryRun() {
    try {
        await db.init();
        const result = await MaintenanceServiceV4.deduplicateMatches(true); // Dry Run
        console.log('DRY RUN RESULT:', JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runDryRun();
