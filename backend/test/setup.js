import db from '../src/config/database.js';
import MigrationService from '../src/services/v3/MigrationService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupTestDb() {
    process.env.DATABASE_PATH = ':memory:';
    await db.init();

    // Use .exec() for multiple SQL statements - Only use 02_V3_schema.sql which is the current source of truth
    const schemaPath = path.resolve(__dirname, '../../sql/schema/02_V3_schema.sql');
    if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        db.db.exec(sql);
    }

    // Always run migrations as they might fix/add columns
    await MigrationService.runPending();

    return db;
}

export async function teardownTestDb() {
}
