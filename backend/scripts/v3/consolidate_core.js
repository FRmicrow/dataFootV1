import db from '../../src/config/database.js';

/**
 * Targeted Core Team Consolidation.
 * Merges top club IDs across CORE tables only to avoid FK errors.
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
    1176: 1172,   // Le Mans
    18887: 1172,  // Le Mans
    21538: 1172,  // Le Mans
    21540: 1172,  // Le Mans
    21537: 14,    // Rennes
    21539: 14     // Rennes
};

async function consolidateCore() {
    try {
        await db.init();
        console.log('--- Starting Core Consolidation ---');

        for (const [fromIdStr, toId] of Object.entries(MERGE_MAP)) {
            const fromId = parseInt(fromIdStr);
            if (fromId === toId) continue;

            console.log(`Merging ID ${fromId} -> ${toId}...`);

            // Core tables with conflict handling
            await db.run("DELETE FROM v3_fixture_lineups t1 WHERE t1.team_id = $1 AND EXISTS (SELECT 1 FROM v3_fixture_lineups t2 WHERE t2.fixture_id = t1.fixture_id AND t2.team_id = $2)", [fromId, toId]);
            await db.run("UPDATE v3_fixture_lineups SET team_id = $1 WHERE team_id = $2", [toId, fromId]);

            await db.run("DELETE FROM v3_fixture_player_stats t1 WHERE t1.team_id = $1 AND EXISTS (SELECT 1 FROM v3_fixture_player_stats t2 WHERE t2.fixture_id = t1.fixture_id AND t2.player_id = t1.player_id AND t2.team_id = $2)", [fromId, toId]);
            await db.run("UPDATE v3_fixture_player_stats SET team_id = $1 WHERE team_id = $2", [toId, fromId]);

            await db.run("DELETE FROM v3_player_stats t1 WHERE t1.team_id = $1 AND EXISTS (SELECT 1 FROM v3_player_stats t2 WHERE t2.player_id = t1.player_id AND t2.team_id = $2 AND t2.league_id = t1.league_id AND t2.season_year = t1.season_year)", [fromId, toId]);
            await db.run("UPDATE v3_player_stats SET team_id = $1 WHERE team_id = $2", [toId, fromId]);

            await db.run("DELETE FROM v3_standings t1 WHERE t1.team_id = $1 AND EXISTS (SELECT 1 FROM v3_standings t2 WHERE t2.league_id = t1.league_id AND t2.season_year = t1.season_year AND t2.team_id = $2)", [fromId, toId]);
            await db.run("UPDATE v3_standings SET team_id = $1 WHERE team_id = $2", [toId, fromId]);

            // Simple updates for fixtures (no unique constraints on team_id here)
            await db.run("UPDATE v3_fixtures SET home_team_id = $1 WHERE home_team_id = $2", [toId, fromId]);
            await db.run("UPDATE v3_fixtures SET away_team_id = $1 WHERE away_team_id = $2", [toId, fromId]);

            // Note: We skip DELETE from v3_teams to avoid FK errors in ML/Secondary tables.
            // The team record remains but won't be pointed to by fixtures/squads.
        }

        console.log('--- Core Consolidation Complete ---');
        process.exit(0);

    } catch (err) {
        console.error('Consolidation failed:', err);
        process.exit(1);
    }
}

consolidateCore();
