
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.sqlite');

const merges = [
    { keep: 9, duplicate: 308 },
    { keep: 16, duplicate: 307 },
    { keep: 15, duplicate: 306 },
    { keep: 6, duplicate: 304 },
    { keep: 19, duplicate: 301 }
];

async function forceMerge() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    try {
        db.exec("BEGIN TRANSACTION");
        console.log("🔥 Force Merge & Delete Started...");

        for (const { keep, duplicate } of merges) {
            console.log(`\n👉 Processing ${duplicate} -> ${keep}`);

            // 1. Move Trophies (table uses team_id)
            const trophies = db.exec(`SELECT count(*) FROM team_trophies WHERE team_id = ${duplicate}`);
            const tCount = trophies[0]?.values[0][0] || 0;
            console.log(`   - Found ${tCount} trophies to move`);

            if (tCount > 0) {
                db.run(`UPDATE OR IGNORE team_trophies SET team_id = ? WHERE team_id = ?`, [keep, duplicate]);
            }

            // 2. Delete EVERYTHING related to duplicate
            db.run(`DELETE FROM team_trophies WHERE team_id = ?`, [duplicate]);
            db.run(`DELETE FROM team_statistics WHERE team_id = ?`, [duplicate]);
            db.run(`DELETE FROM standings WHERE team_id = ?`, [duplicate]);

            // Correct column name is club_id
            db.run(`DELETE FROM player_club_stats WHERE club_id = ?`, [duplicate]);

            // 3. Delete Team
            db.run(`DELETE FROM teams WHERE id = ?`, [duplicate]);

            // Verify
            const check = db.exec(`SELECT count(*) FROM teams WHERE id = ${duplicate}`);
            if (check[0].values[0][0] === 0) {
                console.log(`   ✅ Team ${duplicate} successfully deleted.`);
            } else {
                console.error(`   ❌ Failed to delete Team ${duplicate}`);
            }
        }

        db.exec("COMMIT");

        // Save
        const data = db.export();
        writeFileSync(dbPath, data);
        console.log("\n🎉 Force Merge completed.");

    } catch (err) {
        console.error("❌ Fatal Error:", err);
        db.exec("ROLLBACK");
    } finally {
        db.close();
    }
}

forceMerge();
