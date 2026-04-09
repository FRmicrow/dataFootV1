import 'dotenv/config';
import db from '../../src/config/database.js';

async function cleanup() {
    try {
        await db.init();
        
        console.log(`Cleaning up anomalous ${SEASON} fixtures...`);

        // 1. Delete from league_id 61 (UEFA Nations League mis-assignment)
        const res61 = await db.run("DELETE FROM v3_fixtures WHERE league_id = 61 AND season_year = 2009");
        console.log(`- Deleted ${res61.changes} fixtures from League 61.`);

        // 2. Delete from league_id 1 where api_id IS NULL (Anomalous duplicates)
        const res1 = await db.run("DELETE FROM v3_fixtures WHERE league_id = 1 AND season_year = 2009 AND api_id IS NULL");
        console.log(`- Deleted ${res1.changes} anomalous fixtures from League 1.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

cleanup();
