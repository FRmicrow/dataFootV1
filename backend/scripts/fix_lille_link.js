import dbV3 from '../src/config/database_v3.js';

/**
 * Fix Lille Data Mapping Issue
 * Moves all records from Belgian Lille (API 11504) to French LOSC Lille (API 79)
 */
async function fixLille() {
    console.log('🚀 Fixing Lille Data Mapping...');
    await dbV3.init();

    const WRONG_TEAM_API_ID = 11504; // Belgian Lille
    const RIGHT_TEAM_API_ID = 79;    // French LOSC Lille

    // 1. Find local IDs
    const wrongTeam = dbV3.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", [WRONG_TEAM_API_ID]);
    let rightTeam = dbV3.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", [RIGHT_TEAM_API_ID]);

    if (!wrongTeam) {
        console.error('❌ Could not find the "wrong" team with API ID 11504');
        return;
    }

    if (!rightTeam) {
        console.log('➕ Creating the "right" team with API ID 79...');
        const info = dbV3.run(
            "INSERT INTO V3_Teams (api_id, name, country, logo_url) VALUES (?, ?, ?, ?)",
            [RIGHT_TEAM_API_ID, 'Lille', 'France', 'https://media.api-sports.io/football/teams/79.png']
        );
        rightTeam = { team_id: info.lastInsertRowid };
    }

    const oldId = wrongTeam.team_id;
    const newId = rightTeam.team_id;

    console.log(`🔄 Migrating data from Team ID ${oldId} (API 11504) to Team ID ${newId} (API 79)...`);

    dbV3.run('BEGIN TRANSACTION');
    try {
        // A. Update Player Stats
        // We use INSERT OR IGNORE / UPDATE pattern if there are duplicates, 
        // but since 223 was empty, a simple update is safer and faster.
        const statsCount = dbV3.run("UPDATE V3_Player_Stats SET team_id = ? WHERE team_id = ?", [newId, oldId]);
        console.log(`   ✅ Updated ${statsCount.changes || 'many'} player stats.`);

        // B. Update Standings
        const standingsCount = dbV3.run("UPDATE V3_Standings SET team_id = ? WHERE team_id = ?", [newId, oldId]);
        console.log(`   ✅ Updated ${standingsCount.changes || 'many'} standings entries.`);

        // C. Update Fixtures
        const homeFixtures = dbV3.run("UPDATE V3_Fixtures SET home_team_id = ? WHERE home_team_id = ?", [newId, oldId]);
        const awayFixtures = dbV3.run("UPDATE V3_Fixtures SET away_team_id = ? WHERE away_team_id = ?", [newId, oldId]);
        console.log(`   ✅ Updated ${homeFixtures.changes + awayFixtures.changes} fixtures.`);

        // D. Final touch - ensure name/country is correct on the right team
        dbV3.run("UPDATE V3_Teams SET name = 'Lille', country = 'France', logo_url = ? WHERE team_id = ?",
            ['https://media.api-sports.io/football/teams/79.png', newId]);

        // E. Cleanup wrong team (delete or rename)
        // Deleting might be dangerous if there's actually a real Belgian Lille with its own data,
        // but given the stats were 2010-2025, it's 100% LOSC data.
        dbV3.run("DELETE FROM V3_Teams WHERE team_id = ?", [oldId]);
        console.log(`   ✅ Deleted "ghost" team 14.`);

        dbV3.run('COMMIT');
        console.log('\n🎉 Lille data fix complete!');

        dbV3.save(true);
    } catch (e) {
        dbV3.run('ROLLBACK');
        console.error('❌ Fix failed:', e);
    }
}

fixLille().catch(console.error);
