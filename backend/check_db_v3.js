import db from './src/config/database.js';

async function testFetch() {
    await db.init();

    console.log("Fixtures with Team Stats:");
    const fixtures = db.all("SELECT DISTINCT fixture_id FROM V3_Fixture_Stats LIMIT 10");
    console.log(fixtures.map(f => f.fixture_id));

    if (fixtures.length > 0) {
        const fid = fixtures[0].fixture_id;
        console.log(`\nDetailed Info for Fixture ${fid}:`);
        const info = db.get("SELECT f.fixture_id, f.date, l.name as league FROM V3_Fixtures f JOIN V3_Leagues l ON f.league_id = l.league_id WHERE f.fixture_id = ?", [fid]);
        console.log(info);
    }
}

testFetch().catch(console.error);
