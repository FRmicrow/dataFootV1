const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function finalAudit() {
    const dbPath = path.resolve(__dirname, 'backend/database.sqlite');
    console.log(`Starting Final Audit for: ${dbPath}\n`);

    if (!fs.existsSync(dbPath)) {
        console.error('❌ Database file not found!');
        return;
    }

    let db;
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
    } catch (error) {
        console.error('Failed to open database:', error);
        return;
    }

    // 1. Verify Cleanliness (No Non-V2 Tables)
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const allTableNames = tables.map(t => t.name);
    const nonV2Tables = allTableNames.filter(t => !t.startsWith('V2_') && t !== 'sqlite_sequence');

    if (nonV2Tables.length === 0) {
        console.log('✅ CLEANLINESS CHECK: PASSED (Only V2_ tables found)');
    } else {
        console.error('❌ CLEANLINESS CHECK: FAILED (Found unexpected tables: ' + nonV2Tables.join(', ') + ')');
    }

    // 2. Verify Data Integrity (Row Counts)
    console.log('\n--- Data Volume Check ---');
    const keyTables = ['V2_players', 'V2_clubs', 'V2_competitions', 'V2_player_statistics'];
    for (const tableName of keyTables) {
        if (allTableNames.includes(tableName)) {
            const count = await db.get(`SELECT COUNT(*) as count FROM "${tableName}"`);
            console.log(`  - ${tableName}: ${count.count} rows`);
        } else {
            console.error(`  - ${tableName}: MISSING!`);
        }
    }

    // 3. Verify Constraints (Orphaned Records)
    console.log('\n--- Integrity Check (Orphans) ---');

    // Players without stats? (Not strictly wrong, but good to know)
    // Stats without players (CRITICAL)
    const orphanedStats = await db.get(`
        SELECT COUNT(*) as count 
        FROM V2_player_statistics ps 
        LEFT JOIN V2_players p ON ps.player_id = p.player_id 
        WHERE p.player_id IS NULL
    `);

    if (orphanedStats.count === 0) {
        console.log('✅ INTEGRITY: No orphaned player statistics found.');
    } else {
        console.error(`❌ INTEGRITY: Found ${orphanedStats.count} orphaned player statistics!`);
    }

    console.log('\n--- Final Schema Summary ---');
    console.log(allTableNames.join(', '));

    await db.close();
}

finalAudit();
