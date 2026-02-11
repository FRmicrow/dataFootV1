
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database_v3_test.sqlite');

async function repair() {
    console.log("🚀 Starting V3 Bad API ID Cleanup...");

    try {
        const SQL = await initSqlJs();
        if (!existsSync(dbPath)) {
            console.error("Database not found!");
            return;
        }
        const buffer = readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        // 1. Identify Leagues where api_id looks like a local id (usually small integers are APIs, big ones are locals... but wait)
        // Actually, the issue is we have DUPLICATE entries or entries with WRONG api_id.
        // The polluted entry has api_id = 1113 (Bahrain) but might be named "Cup (Austria)".

        // Let's find leagues where the API response would be Bahrain (ID 1113) but the name isn't.
        // Or simply: DELETE leagues that were imported by mistake. 
        // We know that Discovery Panel sent local IDs.

        // Strategy: 
        // Get all leagues. 
        // If api_id exists in ANOTHER row as league_id, that's a red flag! 
        // It means row A has api_id = X, where X is actually the primary key of row B.
        // This is exactly what happened: "Import sent ID 1113 (local PK) -> API treated it as API ID 1113".

        const rows = [];
        const stmt = db.prepare("SELECT league_id, api_id, name FROM V3_Leagues");
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();

        const leagueIds = new Set(rows.map(r => r.league_id));
        let badCount = 0;

        db.run('BEGIN TRANSACTION');

        for (const l of rows) {
            // Check if this league's API ID is actually pointing to a LOCAL league_id
            if (leagueIds.has(l.api_id)) {
                // Suspicious! 
                // Is it a coincidence? API ID 39 (Premier League) matches League ID 39? Possible.
                // But typically local IDs start at 1 and go up. API IDs are sparse.

                // Let's be aggressive: If name doesn't match roughly?
                // Or: The user said "Bahrain pollution". API ID 1113 is Bahrain.
                // If we have a league with api_id=1113 but Name="Cup (Austria)", DELETE IT.

                if (l.api_id === 1113 || l.api_id === 1124) { // 1124 was also in logs
                    console.log(`🗑️ Deleting Suspect: [${l.league_id}] ${l.name} (API ID: ${l.api_id})`);

                    // Delete related content to be clean
                    db.run("DELETE FROM V3_Player_Stats WHERE league_id = ?", [l.league_id]);
                    db.run("DELETE FROM V3_League_Seasons WHERE league_id = ?", [l.league_id]);
                    db.run("DELETE FROM V3_Leagues WHERE league_id = ?", [l.league_id]);
                    badCount++;
                }
            }
        }

        db.run('COMMIT');
        console.log(`✅ Cleaned up ${badCount} polluted leagues.`);

        // Save
        const data = db.export();
        writeFileSync(dbPath, data);
        console.log("💾 Database saved successfully.");

    } catch (err) {
        console.error("❌ Repair failed:", err);
    }
}

repair();
