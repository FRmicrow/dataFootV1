import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../backend/database.sqlite');

const db = new sqlite3.Database(dbPath);

const mappings = {
    "USA": "United States",
    "Czechia": "Czech Republic",
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Congo DR": "Congo",
    "Korea Republic": "South Korea",
    "Türkiye": "Turkey"
};

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
        console.log('🔄 Applying manual mappings for V3_Countries...');

        for (const [v3Name, v2Name] of Object.entries(mappings)) {
            const v2Data = await get("SELECT * FROM V2_countries WHERE country_name = ?", [v2Name]);
            if (v2Data) {
                const v3 = await get("SELECT country_id FROM V3_Countries WHERE name = ?", [v3Name]);
                if (v3) {
                    console.log(`🔗 Mapping ${v3Name} to ${v2Name} metadata...`);
                    await run(`
                        UPDATE V3_Countries 
                        SET importance_rank = ?, flag_url = ?, flag_small_url = ?, continent = ?
                        WHERE country_id = ?
                    `, [v2Data.importance_rank, v2Data.flag_url, v2Data.flag_small_url, v2Data.continent, v3.country_id]);
                }
            }
        }

        console.log('✅ Manual mapping complete!');

    } catch (error) {
        console.error('❌ Error during manual mapping:', error);
    } finally {
        db.close();
    }
}

main();
