
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.sqlite');

const merges = [
    { keep: 9, duplicate: 308 },   // Wolverhampton Wanderers
    { keep: 16, duplicate: 307 },  // West Ham United
    { keep: 15, duplicate: 306 },  // Tottenham Hotspur
    { keep: 6, duplicate: 304 },   // Newcastle United
    { keep: 19, duplicate: 301 }   // Everton
];

async function runMerge() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    try {
        db.exec("BEGIN TRANSACTION");

        console.log("🔄 Starting Team Merge Process...");

        // Prepare statements
        const tables = [
            'player_club_stats',
            'player_national_stats',
            'player_trophies',
            'standings',
            'team_statistics',
            'team_trophies'
        ];

        for (const { keep, duplicate } of merges) {
            console.log(`\n👉 Merging Team ID ${duplicate} into ${keep}...`);

            // Verify teams exist
            const check = db.exec(`SELECT id, name FROM teams WHERE id IN (${keep}, ${duplicate})`);
            if (check.length === 0 || check[0].values.length < 2) {
                console.warn(`   ⚠️ One or both teams not found (Keep: ${keep}, Dup: ${duplicate}). Skipping.`);
                continue;
            }

            check[0].values.forEach(row => console.log(`   - Found: [${row[0]}] ${row[1]}`));

            // Update references in all tables
            for (const table of tables) {
                // Check if table has team_id column (it should, but safety first for generic approach, logic here assumes these tables have team_id)
                // For tables with Unique constraints (like team_trophies unique(team_id, trophy_id, season_id)), simple UPDATE might fail if target exists.
                // We will try UPDATE OR IGNORE, then DELETE leftovers?
                // SQL.js/SQLite 'UPDATE OR IGNORE' isn't standard SQL but often supported or we handle conflict.

                try {
                    // Update rows belonging to duplicate team to point to keep team
                    db.run(`UPDATE OR IGNORE ${table} SET team_id = ? WHERE team_id = ?`, [keep, duplicate]);

                    // If any rows remain with duplicate ID (because of conflict with existing Keep ID rows), delete them?
                    // Usually for stats/trophies, if the "Keep" team already has the record, we can discard the duplicate's version.
                    // If "Merge" implies preserving unique data from Duplicate...
                    // In this context: Duplicate (300+) has Trophies. Keep (Low ID) has Stats. They shouldn't overlap much.
                    // If they DO overlap (e.g. duplicate team entry in standings vs keep team entry), we probably favor the Keep one.

                    const deleteRes = db.run(`DELETE FROM ${table} WHERE team_id = ?`, [duplicate]);
                    if (db.getRowsModified() > 0) {
                        console.log(`   - Cleaned up duplicate conflicts in ${table}`);
                    }

                } catch (e) {
                    console.error(`   ❌ Error updating ${table}:`, e.message);
                }
            }

            // Finally, delete the duplicate team
            db.run(`DELETE FROM teams WHERE id = ?`, [duplicate]);
            console.log(`   ✅ Deleted duplicate Team ID ${duplicate}`);
        }

        db.exec("COMMIT");

        // Save
        const data = db.export();
        writeFileSync(dbPath, data);
        console.log("\n🎉 Merge completed successfully!");

    } catch (err) {
        console.error("❌ Fatal Error:", err);
        db.exec("ROLLBACK");
    } finally {
        db.close();
    }
}

runMerge();
