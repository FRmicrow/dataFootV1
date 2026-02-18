import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const sourceDbPath = path.resolve(__dirname, '../backend/database.sqlite');
const targetDbPath = path.resolve(__dirname, '../database_v3_test.sqlite');

console.log('🚀 Starting cross-database sync...');
console.log(`Source: ${sourceDbPath}`);
console.log(`Target: ${targetDbPath}`);

const sourceDb = new sqlite3.Database(sourceDbPath);
const targetDb = new sqlite3.Database(targetDbPath);

const targetRun = (sql, params = []) => new Promise((resolve, reject) => {
    targetDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const targetGet = (sql, params = []) => new Promise((resolve, reject) => {
    targetDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const targetAll = (sql, params = []) => new Promise((resolve, reject) => {
    targetDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const sourceAll = (sql, params = []) => new Promise((resolve, reject) => {
    sourceDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const mappings = {
    "USA": "United States",
    "Czechia": "Czech Republic",
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Congo DR": "Congo",
    "Korea Republic": "South Korea",
    "Türkiye": "Turkey"
};

async function main() {
    try {
        // 1. Ensure V3_Countries table and columns exist in TARGET
        console.log('🛠 Preparing TARGET schema...');

        // Check if table exists
        const tableCheck = await targetGet("SELECT name FROM sqlite_master WHERE type='table' AND name='V3_Countries'");
        if (!tableCheck) {
            console.log('➕ Creating V3_Countries table in TARGET...');
            await targetRun(`CREATE TABLE V3_Countries (
                country_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                code TEXT,
                flag_url TEXT,
                api_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        }

        const columnsToAdd = [
            { name: 'importance_rank', type: 'INTEGER DEFAULT 5' },
            { name: 'continent', type: 'TEXT' },
            { name: 'flag_small_url', type: 'TEXT' }
        ];

        const tableInfo = await targetAll("PRAGMA table_info(V3_Countries)");
        const existingColumns = tableInfo.map(c => c.name);

        for (const col of columnsToAdd) {
            if (!existingColumns.includes(col.name)) {
                console.log(`➕ Adding column ${col.name} to TARGET...`);
                await targetRun(`ALTER TABLE V3_Countries ADD COLUMN ${col.name} ${col.type}`);
            }
        }

        // 2. Fetch data from SOURCE
        console.log('📡 Fetching data from SOURCE (V2_countries)...');
        const v2Countries = await sourceAll("SELECT * FROM V2_countries");

        let insertedCount = 0;
        let updatedCount = 0;

        // 3. Sync to TARGET
        for (const v2 of v2Countries) {
            // Check direct match
            let targetCountry = await targetGet("SELECT country_id FROM V3_Countries WHERE name = ?", [v2.country_name]);

            // If no direct match, check mappings (reverse check: v2Name to v3Name)
            if (!targetCountry) {
                const v3Name = Object.keys(mappings).find(key => mappings[key] === v2.country_name);
                if (v3Name) {
                    targetCountry = await targetGet("SELECT country_id FROM V3_Countries WHERE name = ?", [v3Name]);
                }
            }

            if (targetCountry) {
                // Update
                await targetRun(`
                    UPDATE V3_Countries 
                    SET code = ?, importance_rank = ?, flag_url = ?, flag_small_url = ?, continent = ?
                    WHERE country_id = ?
                `, [v2.country_code, v2.importance_rank, v2.flag_url, v2.flag_small_url, v2.continent, targetCountry.country_id]);
                updatedCount++;
            } else {
                // Insert
                await targetRun(`
                    INSERT INTO V3_Countries (name, code, importance_rank, flag_url, flag_small_url, continent)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [v2.country_name, v2.country_code, v2.importance_rank, v2.flag_url, v2.flag_small_url, v2.continent]);
                insertedCount++;
            }
        }

        console.log(`✅ Cross-DB Sync complete!`);
        console.log(`📊 Result: ${insertedCount} inserted, ${updatedCount} updated into V3 Experimental DB.`);

    } catch (error) {
        console.error('❌ Error during cross-DB sync:', error);
    } finally {
        sourceDb.close();
        targetDb.close();
    }
}

main();
