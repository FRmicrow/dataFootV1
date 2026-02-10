import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../backend/database.sqlite'); // Corrected path

const db = new sqlite3.Database(dbPath);

console.log('🚀 Starting V3_Countries schema update and data sync...');

const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

async function main() {
    try {
        // 1. Add missing columns to V3_Countries
        const columnsToAdd = [
            { name: 'importance_rank', type: 'INTEGER DEFAULT 5' },
            { name: 'continent', type: 'TEXT' },
            { name: 'flag_small_url', type: 'TEXT' }
        ];

        const tableInfo = await all("PRAGMA table_info(V3_Countries)");
        const existingColumns = tableInfo.map(c => c.name);

        for (const col of columnsToAdd) {
            if (!existingColumns.includes(col.name)) {
                console.log(`➕ Adding column ${col.name} to V3_Countries...`);
                await run(`ALTER TABLE V3_Countries ADD COLUMN ${col.name} ${col.type}`);
            } else {
                console.log(`ℹ️ Column ${col.name} already exists in V3_Countries.`);
            }
        }

        // 2. Sync data from V2_countries to V3_Countries
        console.log('🔄 Syncing data from V2_countries to V3_Countries...');

        const v2Countries = await all(`
            SELECT country_name, country_code, importance_rank, flag_url, flag_small_url, continent 
            FROM V2_countries
        `);

        let insertedCount = 0;
        let updatedCount = 0;

        for (const v2 of v2Countries) {
            const v3 = await get("SELECT country_id FROM V3_Countries WHERE name = ?", [v2.country_name]);

            if (v3) {
                // Update existing
                await run(`
                    UPDATE V3_Countries 
                    SET code = ?, importance_rank = ?, flag_url = ?, flag_small_url = ?, continent = ?
                    WHERE country_id = ?
                `, [v2.country_code, v2.importance_rank, v2.flag_url, v2.flag_small_url, v2.continent, v3.country_id]);
                updatedCount++;
            } else {
                // Insert new
                await run(`
                    INSERT INTO V3_Countries (name, code, importance_rank, flag_url, flag_small_url, continent)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [v2.country_name, v2.country_code, v2.importance_rank, v2.flag_url, v2.flag_small_url, v2.continent]);
                insertedCount++;
            }
        }

        console.log(`✅ Sync complete!`);
        console.log(`📊 Result: ${insertedCount} inserted, ${updatedCount} updated.`);

    } catch (error) {
        console.error('❌ Error during sync:', error);
    } finally {
        db.close();
    }
}

main();
