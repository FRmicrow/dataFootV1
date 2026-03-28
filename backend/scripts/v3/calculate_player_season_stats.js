import 'dotenv/config';
import db from '../../src/config/database.js';

const LEAGUE_ID = 1;
const SEASON = parseInt(process.argv[2]) || 2009;

async function calculateStats() {
    try {
        await db.init();
        
        console.log(`Calculating player statistics for Ligue 1 2009...`);

        // 1. Get all players for this league/season
        const players = await db.all(`
            SELECT DISTINCT ps.player_id, ps.team_id 
            FROM v3_player_season_stats ps
            WHERE ps.league_id = $1 AND ps.season_year = $2
        `, [LEAGUE_ID, SEASON]);

        console.log(`Processing ${players.length} player-team combinations...`);

        for (const p of players) {
            // Count Appearances
            const appRes = await db.get(`
                SELECT COUNT(*) as count 
                FROM v3_fixture_player_stats fps
                JOIN v3_fixtures f ON fps.fixture_id = f.fixture_id
                WHERE fps.player_id = $1 AND fps.team_id = $2 AND f.league_id = $3 AND f.season_year = $4
            `, [p.player_id, p.team_id, LEAGUE_ID, SEASON]);

            // Count Goals
            const goalRes = await db.get(`
                SELECT COUNT(*) as count 
                FROM v3_fixture_events fe
                JOIN v3_fixtures f ON fe.fixture_id = f.fixture_id
                WHERE fe.player_id = $1 AND fe.team_id = $2 AND f.league_id = $3 AND f.season_year = $4 AND fe.type = 'Goal'
            `, [p.player_id, p.team_id, LEAGUE_ID, SEASON]);

            // Count Assists
            const assistRes = await db.get(`
                SELECT COUNT(*) as count 
                FROM v3_fixture_events fe
                JOIN v3_fixtures f ON fe.fixture_id = f.fixture_id
                WHERE fe.assist_id = $1 AND fe.team_id = $2 AND f.league_id = $3 AND f.season_year = $4 AND fe.type = 'Goal'
            `, [p.player_id, p.team_id, LEAGUE_ID, SEASON]);

            // Calculate Minutes Played (Simplified for now: Starts * 90)
            // TODO: Improve with substitution logic if needed
            const startRes = await db.get(`
                SELECT COUNT(*) as count 
                FROM v3_fixture_player_stats fps
                JOIN v3_fixtures f ON fps.fixture_id = f.fixture_id
                WHERE fps.player_id = $1 AND fps.team_id = $2 AND f.league_id = $3 AND f.season_year = $4 AND fps.is_start_xi = true
            `, [p.player_id, p.team_id, LEAGUE_ID, SEASON]);

            const minutes = parseInt(startRes.count) * 90;

            // Update v3_player_season_stats
            await db.run(`
                UPDATE v3_player_season_stats
                SET appearances = $1, goals_total = $2, goals_assists = $3, minutes_played = $4
                WHERE player_id = $5 AND team_id = $6 AND league_id = $7 AND season_year = $8
            `, [parseInt(appRes.count), parseInt(goalRes.count), parseInt(assistRes.count), minutes, p.player_id, p.team_id, LEAGUE_ID, SEASON]);
        }

        console.log('Player statistics aggregation complete!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

calculateStats();
