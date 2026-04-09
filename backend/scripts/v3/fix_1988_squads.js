import db from '../../src/config/database.js';

/**
 * Surgical Fix for 1988-1989 Duplicated Teams.
 * Merges the TM_Historical IDs into their existing counterparts.
 */

const REPAIR_MAP = {
    21542: 20531, // AS Cannes
    21543: 20558, // Stade Lavallois
    21544: 18855, // Sporting Club de Toulon et du Var
    21545: 18873  // Matra Racing
};

async function fix1988() {
    try {
        await db.init();
        console.log('--- Starting Surgical 1988 Fix ---');

        for (const [fromId, toId] of Object.entries(REPAIR_MAP)) {
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

            await db.run("UPDATE v3_fixtures SET home_team_id = $1 WHERE home_team_id = $2", [toId, fromId]);
            await db.run("UPDATE v3_fixtures SET away_team_id = $1 WHERE away_team_id = $2", [toId, fromId]);

            // Marks as merged but don't delete to avoid FK breakage
            await db.run("UPDATE v3_teams SET name = name || ' (Merged-1988)' WHERE team_id = $1", [fromId]);
        }

        console.log('--- Surgical 1988 Fix Complete ---');
        process.exit(0);

    } catch (err) {
        console.error('Fix failed:', err);
        process.exit(1);
    }
}

fix1988();
