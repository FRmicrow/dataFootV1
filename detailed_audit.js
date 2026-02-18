const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function detailedAudit() {
    const dbPath = '/Users/dominiqueparsis/statFootV3/backend/database.sqlite';
    console.log(`Detailed Audit for: ${dbPath}\n`);

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

    // 1. Identify Non-V2 Tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const allTableNames = tables.map(t => t.name);
    const v2Tables = allTableNames.filter(t => t.startsWith('V2_'));
    const otherTables = allTableNames.filter(t => !t.startsWith('V2_') && t !== 'sqlite_sequence');

    console.log('--- CLEANUP CANDIDATES (Non-V2 Tables) ---');
    console.log(otherTables.join(', '));
    console.log(`\nTotal Non-V2 Tables: ${otherTables.length}`);

    // 2. Data Integrity Checks
    console.log('\n--- DATA INTEGRITY CHECKS ---');

    // Check for orphaned stats
    const orphanedStats = await db.get(`
    SELECT COUNT(*) as count 
    FROM V2_player_statistics ps 
    LEFT JOIN V2_players p ON ps.player_id = p.player_id 
    WHERE p.player_id IS NULL
  `);
    console.log(`Orphaned Player Statistics: ${orphanedStats.count}`);

    // Check for orphaned club trophies
    const orphanedClubTrophies = await db.get(`
    SELECT COUNT(*) as count 
    FROM V2_club_trophies ct
    LEFT JOIN V2_clubs c ON ct.club_id = c.club_id 
    WHERE c.club_id IS NULL
  `);
    console.log(`Orphaned Club Trophies: ${orphanedClubTrophies.count}`);

    // Check for orphaned player trophies
    const orphanedPlayerTrophies = await db.get(`
    SELECT COUNT(*) as count 
    FROM V2_player_trophies pt
    LEFT JOIN V2_players p ON pt.player_id = p.player_id 
    WHERE p.player_id IS NULL
  `);
    console.log(`Orphaned Player Trophies: ${orphanedPlayerTrophies.count}`);

    await db.close();
}

detailedAudit();
