import db from '../../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * MigrationService
 * Handles database schema evolution and tracking.
 */
class MigrationService {
    constructor() {
        this.registryPath = path.join(__dirname, '../../migrations/registry');
    }

    /**
     * Initialize migration tracking table
     */
    initTrackingTable() {
        db.run(`
            CREATE TABLE IF NOT EXISTS V3_Migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    /**
     * Run all pending migrations
     */
    async runPending() {
        this.initTrackingTable();

        console.log('🏗️  Checking for Database Migrations...');

        // Ensure registry directory exists
        if (!fs.existsSync(this.registryPath)) {
            fs.mkdirSync(this.registryPath, { recursive: true });
        }

        const files = fs.readdirSync(this.registryPath)
            .filter(f => f.endsWith('.js'))
            .sort();

        const applied = db.all('SELECT name FROM V3_Migrations').map(m => m.name);
        let runCount = 0;

        for (const file of files) {
            if (!applied.includes(file)) {
                console.log(`🚀 Applying migration: ${file}...`);
                const { up } = await import(path.join(this.registryPath, file));

                try {
                    // Start transaction for each migration if not already handled
                    db.run('BEGIN TRANSACTION');
                    await up(db);
                    db.run('INSERT INTO V3_Migrations (name) VALUES (?)', [file]);
                    db.run('COMMIT');
                    console.log(`✅ Successfully applied ${file}`);
                    runCount++;
                } catch (error) {
                    db.run('ROLLBACK');
                    console.error(`❌ Failed to apply migration ${file}:`, error.message);
                    throw error;
                }
            }
        }

        if (runCount === 0) {
            console.log('✨ Database is up to date.');
        } else {
            console.log(`🎉 Finished running ${runCount} migrations.`);
        }
    }
}

export default new MigrationService();
