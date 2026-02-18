const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

async function cleanupDatabase() {
    const dbPath = path.resolve(__dirname, 'backend/database.sqlite');
    console.log(`Cleaning up database at: ${dbPath}`);

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

    // 1. Get all tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const allTableNames = tables.map(t => t.name);

    // 2. Identify tables to drop (Exclude V2_ prefix and sqlite_sequence)
    const tablesToDrop = allTableNames.filter(t => !t.startsWith('V2_') && t !== 'sqlite_sequence');

    console.log(`\nFound ${tablesToDrop.length} tables to remove.`);
    if (tablesToDrop.length === 0) {
        console.log("Database is already clean!");
        await db.close();
        return;
    }

    // 3. Drop tables
    console.log('\n--- Dropping Tables ---');
    for (const tableName of tablesToDrop) {
        try {
            await db.run(`DROP TABLE IF EXISTS "${tableName}"`);
            console.log(`✅ Dropped: ${tableName}`);
        } catch (err) {
            console.error(`❌ Failed to drop ${tableName}: ${err.message}`);
        }
    }

    // 4. Vacuum
    console.log('\n--- Optimizing Database (VACUUM) ---');
    try {
        await db.run('VACUUM');
        console.log('✅ VACUUM completed successfully.');
    } catch (err) {
        console.error(`❌ VACUUM failed: ${err.message}`);
    }

    // 5. Final Verification check
    const remainingTables = await db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const finalTableNames = remainingTables.map(t => t.name);
    console.log(`\nRemaining Tables in DB (${finalTableNames.length}):`);
    console.log(finalTableNames.join(', '));

    await db.close();
}

cleanupDatabase();
