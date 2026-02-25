import db from './src/config/database.js';

async function testFetch() {
    await db.init();

    console.log("Checking V3_Fixture_Stats...");
    const statsCount = db.get("SELECT COUNT(*) as count FROM V3_Fixture_Stats");
    console.log("Total stats rows:", statsCount.count);

    console.log("\nChecking V3_Fixture_Player_Stats...");
    const pStatsCount = db.get("SELECT COUNT(*) as count FROM V3_Fixture_Player_Stats");
    console.log("Total player stats rows:", pStatsCount.count);

    console.log("\nChecking a specific fixture (e.g., in Ligue 1 2024)...");
    const sample = db.get("SELECT fixture_id FROM V3_Fixtures WHERE league_id = 1 AND status_short='FT' LIMIT 1");
    if (sample) {
        const fixtureStats = db.all("SELECT * FROM V3_Fixture_Stats WHERE fixture_id = ?", [sample.fixture_id]);
        console.log(`Fixture ${sample.fixture_id} stats count:`, fixtureStats.length);
    } else {
        console.log("No finished fixtures found for league_id 1.");
    }
}

testFetch().catch(console.error);
