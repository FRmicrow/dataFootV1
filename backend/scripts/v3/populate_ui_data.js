import 'dotenv/config';
import db from '../../src/config/database.js';
import StatsEngine from '../../src/services/v3/StatsEngine.js';

const LEAGUE_ID = 1;
const SEASON = parseInt(process.argv[2]) || 2009;

async function populate() {
    try {
        await db.init();
        
        console.log(`Aligning UI data for Ligue 1 ${SEASON}...`);

        // 1. Calculate and Persist Standings
        console.log(`- Calculating standings...`);
        const standings = await StatsEngine.getDynamicStandings(LEAGUE_ID, SEASON, 1, 38);
        
        for (const s of standings) {
            await db.run(`
                INSERT INTO V3_Standings (
                    league_id, season_year, team_id, rank, points, goals_diff, played, win, draw, lose, goals_for, goals_against, form, status, description, group_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(league_id, season_year, team_id, group_name) DO UPDATE SET
                    rank = EXCLUDED.rank,
                    points = EXCLUDED.points,
                    goals_diff = EXCLUDED.goals_diff,
                    played = EXCLUDED.played,
                    win = EXCLUDED.win,
                    draw = EXCLUDED.draw,
                    lose = EXCLUDED.lose,
                    goals_for = EXCLUDED.goals_for,
                    goals_against = EXCLUDED.goals_against,
                    form = EXCLUDED.form,
                    update_date = CURRENT_TIMESTAMP
            `, [
                LEAGUE_ID, SEASON, s.team_id, s.rank, s.points, s.goals_diff, s.played, s.win, s.draw, s.lose, s.goals_for, s.goals_against, s.form, 'FT', null, 'Regular Season'
            ]);
        }
        console.log(`- Persisted 20 teams in V3_Standings.`);

        // 2. Populate Player Stats (V3_Player_Stats)
        console.log('- Aggregating player stats...');
        const players = await db.all(`
            SELECT DISTINCT player_id, team_id FROM v3_fixture_player_stats fps
            JOIN v3_fixtures f ON fps.fixture_id = f.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
        `, [LEAGUE_ID, SEASON]);

        const positionMap = {
            'G': 'Goalkeeper',
            'D': 'Defender',
            'M': 'Midfielder',
            'A': 'Attacker',
            'F': 'Attacker',
            'SUB': 'Substitute'
        };

        for (const p of players) {
            // Aggregate all stats for this player/team/season
            // We pick the most frequent position code
            const rawStats = await db.all(`
                SELECT position, COUNT(*) as count,
                    SUM(CASE WHEN is_start_xi = true THEN 1 ELSE 0 END) as lineups,
                    SUM(minutes_played) as minutes,
                    SUM(goals_total) as goals,
                    SUM(goals_assists) as assists,
                    SUM(cards_yellow) as yellow,
                    SUM(cards_red) as red,
                    AVG(NULLIF(CAST(rating AS FLOAT), 0)) as avg_rating
                FROM v3_fixture_player_stats fps
                JOIN v3_fixtures f ON fps.fixture_id = f.fixture_id
                WHERE fps.player_id = ? AND fps.team_id = ? AND f.league_id = ? AND f.season_year = ?
                GROUP BY position
                ORDER BY count DESC
            `, [p.player_id, p.team_id, LEAGUE_ID, SEASON]);

            if (rawStats.length > 0) {
                // Sum up stats across all positions played
                const totalStats = rawStats.reduce((acc, curr) => ({
                    appearances: (acc.appearances || 0) + parseInt(curr.count),
                    lineups: (acc.lineups || 0) + parseInt(curr.lineups || 0),
                    minutes: (acc.minutes || 0) + parseInt(curr.minutes || 0),
                    goals: (acc.goals || 0) + parseInt(curr.goals || 0),
                    assists: (acc.assists || 0) + parseInt(curr.assists || 0),
                    yellow: (acc.yellow || 0) + parseInt(curr.yellow || 0),
                    red: (acc.red || 0) + parseInt(curr.red || 0),
                    ratings: [...(acc.ratings || []), curr.avg_rating].filter(r => r > 0)
                }), {});

                const avgRating = totalStats.ratings.length > 0 
                    ? totalStats.ratings.reduce((a, b) => a + b, 0) / totalStats.ratings.length 
                    : 0;

                const bestPosCode = rawStats[0].position;
                // Positions are already stored as full English names (Goalkeeper, Defender, Midfielder, Attacker)
                // The positionMap is only needed if the source was a single-letter code (G/D/M/A)
                const finalPosition = bestPosCode || 'Unknown';

                await db.run(`
                    INSERT INTO V3_Player_Stats (
                        player_id, team_id, league_id, season_year, 
                        games_appearences, games_lineups, games_minutes, 
                        goals_total, goals_assists, 
                        cards_yellow, cards_red, games_rating, games_position
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(player_id, team_id, league_id, season_year) DO UPDATE SET
                        games_appearences = EXCLUDED.games_appearences,
                        games_lineups = EXCLUDED.games_lineups,
                        games_minutes = EXCLUDED.games_minutes,
                        goals_total = EXCLUDED.goals_total,
                        goals_assists = EXCLUDED.goals_assists,
                        cards_yellow = EXCLUDED.cards_yellow,
                        cards_red = EXCLUDED.cards_red,
                        games_rating = EXCLUDED.games_rating,
                        games_position = EXCLUDED.games_position,
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    p.player_id, p.team_id, LEAGUE_ID, SEASON,
                    totalStats.appearances, totalStats.lineups, totalStats.minutes,
                    totalStats.goals, totalStats.assists,
                    totalStats.yellow, totalStats.red, avgRating.toFixed(2), finalPosition
                ]);
            }
        }
        console.log(`- Populated V3_Player_Stats for ${players.length} player-team records.`);

        // 3. Enable UI Flags in V3_League_Seasons
        console.log('- Enabling league season flags...');
        await db.run(`
            UPDATE v3_league_seasons 
            SET imported_players = true, imported_fixtures = true, imported_standings = true
            WHERE league_id = ? AND season_year = ?
        `, [LEAGUE_ID, SEASON]);
        console.log(`- Ligue 1 ${SEASON} flags updated.`);

        console.log('UI Data Alignment complete!');

    } catch (error) {
        console.error('Error Alignment:', error);
    } finally {
        process.exit();
    }
}

populate();
