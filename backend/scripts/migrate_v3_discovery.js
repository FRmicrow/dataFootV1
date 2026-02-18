
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database_v3_test.sqlite');

async function migrate() {
    console.log("🚀 Starting migration: Adding is_discovered to V3_Leagues...");
    try {
        const SQL = await initSqlJs();
        const buffer = readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        // Check if column exists
        try {
            db.exec("SELECT is_discovered FROM V3_Leagues LIMIT 1");
            console.log("ℹ️ Column 'is_discovered' already exists. Skipping.");
        } catch (e) {
            console.log("✨ Column not found. Adding it now...");
            db.run("ALTER TABLE V3_Leagues ADD COLUMN is_discovered BOOLEAN DEFAULT 0;");

            const data = db.export();
            writeFileSync(dbPath, data);
            console.log("✅ Migration successful: is_discovered added.");
        }

    } catch (err) {
        console.error("❌ Migration failed:", err);
    }
}

migrate();
