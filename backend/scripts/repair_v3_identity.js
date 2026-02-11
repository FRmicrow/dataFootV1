
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database_v3_test.sqlite');

async function repair() {
    console.log("🚀 Starting V3 Identity Repair...");

    try {
        const SQL = await initSqlJs();
        if (!existsSync(dbPath)) {
            console.error("Database not found!");
            return;
        }
        const buffer = readFileSync(dbPath);
        const db = new SQL.Database(buffer);

        // 1. Rename Generics
        console.log("--- Renaming Generic Leagues ---");
        const GENERIC_NAMES = ["Cup", "Premier League", "Super Cup", "Play-offs", "Championship", "League 1", "League 2", "Super League", "Challenge League", "First Division", "Second Division"];

        const leagues = [];
        const stmt = db.prepare("SELECT l.league_id, l.name, c.name as country_name FROM V3_Leagues l LEFT JOIN V3_Countries c ON l.country_id = c.country_id");
        while (stmt.step()) leagues.push(stmt.getAsObject());
        stmt.free();

        let renamedCount = 0;
        for (const l of leagues) {
            if (GENERIC_NAMES.includes(l.name) && l.country_name && l.country_name !== 'World') {
                const newName = `${l.name} (${l.country_name})`;
                console.log(`📝 Renaming [${l.league_id}] ${l.name} -> ${newName}`);
                db.run("UPDATE V3_Leagues SET name = ? WHERE league_id = ?", [newName, l.league_id]);
                renamedCount++;
            }
        }
        console.log(`✅ Renamed ${renamedCount} leagues.`);

        // 2. Delete Orphans
        console.log("--- Removing Orphans (0 Players) ---");
        // We keep leagues that have at least one player stat entry OR are explicitly part of a season tracked?
        // Requirement says "Delete orphan leagues with 0 players". 
        // We'll check V3_Player_Stats.

        const orphans = [];
        const orphanStmt = db.prepare(`
            SELECT league_id, name FROM V3_Leagues 
            WHERE league_id NOT IN (SELECT DISTINCT league_id FROM V3_Player_Stats)
            AND is_discovered = 1
        `);
        // Added AND is_discovered = 1 to be safe? Or all? 
        // User story says: "Delete orphan leagues with 0 players."
        // I'll stick to any league with 0 playersstats. But wait, what if I just imported the league structure but no players yet?
        // Usually import pulls players. But maybe I just created the league.
        // I will restrict to `is_discovered = 1` to only clean up auto-discovered mess, preserving manually imported structure that might be in progress.

        while (orphanStmt.step()) orphans.push(orphanStmt.getAsObject());
        orphanStmt.free();

        let deletedCount = 0;
        for (const o of orphans) {
            console.log(`🗑️ Deleting orphan discovered league: ${o.name} [${o.league_id}]`);
            // Cascade delete seasons? Foreign keys might not be enforced in sql.js by default unless PRAGMA on.
            // But let's delete seasons too to be clean.
            db.run("DELETE FROM V3_League_Seasons WHERE league_id = ?", [o.league_id]);
            db.run("DELETE FROM V3_Leagues WHERE league_id = ?", [o.league_id]);
            deletedCount++;
        }
        console.log(`✅ Deleted ${deletedCount} orphan leagues.`);

        // Save
        const data = db.export();
        writeFileSync(dbPath, data);
        console.log("💾 Database saved successfully.");

    } catch (err) {
        console.error("❌ Repair failed:", err);
    }
}

repair();
