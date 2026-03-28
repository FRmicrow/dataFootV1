import 'dotenv/config';
import db from '../../src/config/database.js';

const LEAGUE_ID = 1;
const SEASON = parseInt(process.argv[2]) || 2009;

async function verify() {
    try {
        await db.init();
        
        console.log(`--- VERIFICATION REPORT: LIGUE 1 2009/2010 ---`);

        // 1. Fixtures Count
        const fixtures = await db.get("SELECT COUNT(*) as count FROM v3_fixtures WHERE league_id = $1 AND season_year = $2", [LEAGUE_ID, SEASON]);
        console.log(`- Total Fixtures: ${fixtures.count} (Expected: 380)`);

        // 2. Events Count
        const events = await db.get(`
            SELECT COUNT(*) as count 
            FROM v3_fixture_events fe
            JOIN v3_fixtures f ON fe.fixture_id = f.fixture_id
            WHERE f.league_id = $1 AND f.season_year = $2
        `, [LEAGUE_ID, SEASON]);
        console.log(`- Total Events: ${events.count}`);

        // 3. Player Stats Count
        const playerStats = await db.all(`
            SELECT COUNT(*) as count 
            FROM v3_player_season_stats 
            WHERE league_id = $1 AND season_year = $2 AND appearances > 0
        `, [LEAGUE_ID, SEASON]);
        console.log(`- Active Players (with appearances): ${playerStats[0].count}`);

        // 4. Top Scorers Check
        const topScorers = await db.all(`
            SELECT p.name, ps.goals_total, t.name as team_name
            FROM v3_player_season_stats ps
            JOIN v3_players p ON ps.player_id = p.player_id
            JOIN v3_teams t ON ps.team_id = t.team_id
            WHERE ps.league_id = $1 AND ps.season_year = $2
            ORDER BY ps.goals_total DESC
            LIMIT 5
        `, [LEAGUE_ID, SEASON]);
        console.log('- Top Scorers:');
        topScorers.forEach(s => console.log(`  * ${s.name} (${s.team_name}): ${s.goals_total}`));

        // 5. Top Assisters Check
        const topAssisters = await db.all(`
            SELECT p.name, ps.goals_assists, t.name as team_name
            FROM v3_player_season_stats ps
            JOIN v3_players p ON ps.player_id = p.player_id
            JOIN v3_teams t ON ps.team_id = t.team_id
            WHERE ps.league_id = $1 AND ps.season_year = $2
            ORDER BY ps.goals_assists DESC
            LIMIT 5
        `, [LEAGUE_ID, SEASON]);
        console.log('- Top Assisters:');
        topAssisters.forEach(a => console.log(`  * ${a.name} (${a.team_name}): ${a.goals_assists}`));

        // 6. Matchday 1 Sample Check
        const m1 = await db.all(`
            SELECT f.date, ht.name as home, at.name as away, f.goals_home, f.goals_away, f.round
            FROM v3_fixtures f
            JOIN v3_teams ht ON f.home_team_id = ht.team_id
            JOIN v3_teams at ON f.away_team_id = at.team_id
            WHERE f.league_id = $1 AND f.season_year = $2 AND f.round = 'Matchday 1'
            ORDER BY f.date
        `, [LEAGUE_ID, SEASON]);
        console.log('- Matchday 1 Results:');
        m1.forEach(m => console.log(`  * ${m.home} ${m.goals_home}-${m.goals_away} ${m.away}`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

verify();
