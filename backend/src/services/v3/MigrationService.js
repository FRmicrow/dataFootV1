import db from '../../config/database.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
     * Initialize migration tracking table (PostgreSQL compatible)
     */
    async initTrackingTable() {
        await db.run(`
            CREATE TABLE IF NOT EXISTS V3_Migrations (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    /**
     * Run all pending migrations
     */
    async runPending() {
        // Ensure registry table exists first using pool
        await this.initTrackingTable();

        console.log('🏗️  Checking for Database Migrations...');

        // Ensure registry directory exists
        if (!fs.existsSync(this.registryPath)) {
            fs.mkdirSync(this.registryPath, { recursive: true });
        }

        const files = fs.readdirSync(this.registryPath)
            .filter(f => f.endsWith('.js'))
            .sort();

        const applied = (await db.all('SELECT name FROM V3_Migrations')).map(m => m.name);
        let runCount = 0;

        for (const file of files) {
            if (!applied.includes(file)) {
                console.log(`🚀 Applying migration: ${file}...`);
                const { up } = await import(path.join(this.registryPath, file));

                // Acquire a dedicated client for the transaction
                const client = await db.getTransactionClient();

                try {
                    await client.beginTransaction();

                    // Pass the transactional client to the 'up' function
                    await up(client);

                    await client.run('INSERT INTO V3_Migrations (name) VALUES ($1)', [file]);
                    await client.commit();

                    console.log(`✅ Successfully applied ${file}`);
                    runCount++;
                } catch (error) {
                    await client.rollback();
                    console.error(`❌ Failed to apply migration ${file}:`, error.message);
                    throw error;
                } finally {
                    client.release();
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
