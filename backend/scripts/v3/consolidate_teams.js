import db from '../../src/config/database.js';

/**
 * Global team consolidation script.
 * Redirects all fragmented historical team data to canonical IDs.
 */

const MERGE_MAP = {
    // Duplicate ID -> Canonical ID
    18727: 2,     // Bordeaux
    20575: 25,    // Auxerre
    20581: 20,    // Lens
    16838: 11504, // Lille
    1779: 17,     // Lorient
    20574: 11,    // Monaco
    18709: 6,     // Montpellier
    18708: 6,     // Montpellier Hérault SC
    18723: 8,     // Nice
    20584: 14,    // Rennes
    1631: 16,     // Toulouse
    20562: 19,    // Metz
    20730: 23,    // Nancy
    18799: 23,    // Nancy
    18728: 23,    // Nancy
    20561: 36,    // Le Havre
    1448: 18710,  // Sète
    20407: 13,    // Reims
    20548: 13,    // Reims
    18731: 13,    // Reims
    18814: 1177,  // Boulogne
    20253: 18,    // Brest
    18851: 18,    // Brest
    20627: 18,    // Brest
    20721: 18,    // Brest
    1685: 30,     // Troyes
    20355: 30,    // Troyes
    18884: 30,    // Troyes
    18808: 30,    // Troyes
    20371: 30,    // Troyes
    20731: 30,    // Troyes
    18707: 26,    // Sochaux
    18737: 18737  // Roubaix-Tourcoing (Canonical)
};

async function mergeTeams() {
    try {
        await db.init();
        console.log('--- Starting Team Consolidation ---');

        for (const [fromIdStr, toId] of Object.entries(MERGE_MAP)) {
            const fromId = parseInt(fromIdStr);
            if (fromId === toId) continue;

            console.log(`Merging Team ID ${fromId} into ${toId}...`);

            // 1. Fixtures
            await db.run("UPDATE v3_fixtures SET home_team_id = $1 WHERE home_team_id = $2", [toId, fromId]);
            await db.run("UPDATE v3_fixtures SET away_team_id = $1 WHERE away_team_id = $2", [toId, fromId]);

            // 2. Lineups & Stats
            await db.run("UPDATE v3_fixture_player_stats SET team_id = $1 WHERE team_id = $2", [toId, fromId]);
            await db.run("UPDATE v3_fixture_lineups SET team_id = $1 WHERE team_id = $2", [toId, fromId]);
            await db.run("UPDATE v3_player_stats SET team_id = $1 WHERE team_id = $2", [toId, fromId]);

            // 3. Events
            await db.run("UPDATE v3_fixture_events SET team_id = $1 WHERE team_id = $2", [toId, fromId]);

            // 4. Standings
            await db.run("UPDATE v3_standings SET team_id = $1 WHERE team_id = $2", [toId, fromId]);

            // 5. Delete the duplicate team
            await db.run("DELETE FROM v3_teams WHERE team_id = $1", [fromId]);
        }

        console.log('--- Consolidation Complete! ---');
        process.exit(0);

    } catch (err) {
        console.error('Error during consolidation:', err);
        process.exit(1);
    }
}

mergeTeams();
