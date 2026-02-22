import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

/**
 * Season Controller for V3 POC
 * Aggregates player stats to simulate standings and leaderboards.
 */

export const getSeasonOverview = async (req, res) => {
    try {
        const { id: leagueId, year: season } = req.params;

        if (!leagueId || !season) {
            return res.status(400).json({ error: "Missing leagueId or season year" });
        }

        console.log(`📊 Fetching Season Overview for League ${leagueId}, Season ${season}`);

        // 1. Fetch League Metadata
        const leagueInfo = db.get(`
            SELECT 
                l.league_id, l.name as league_name, l.logo_url, l.type,
                CASE WHEN c.name = 'World' THEN 'International' ELSE c.name END as country_name, 
                c.flag_url,
                ls.season_year, ls.start_date, ls.end_date, ls.imported_standings
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_League_Seasons ls ON l.league_id = ls.league_id
            WHERE l.league_id = ? AND ls.season_year = ?
        `, [leagueId, season]);

        if (!leagueInfo) {
            return res.status(404).json({ error: "League/Season not found in V3 database" });
        }

        const isFinished = new Date(leagueInfo.end_date) < new Date();

        // 2. Hall of Fame (Historical Data for Header)
        let hallOfFame = null;
        if (isFinished) {
            const winner = db.get(`
                SELECT t.name, t.logo_url 
                FROM V3_Standings s
                JOIN V3_Teams t ON s.team_id = t.team_id
                WHERE s.league_id = ? AND s.season_year = ? AND s.rank = 1
                LIMIT 1
            `, [leagueId, season]);

            const topScorer = db.get(`
                SELECT p.name, ps.goals_total
                FROM V3_Player_Stats ps
                JOIN V3_Players p ON ps.player_id = p.player_id
                WHERE ps.league_id = ? AND ps.season_year = ?
                ORDER BY ps.goals_total DESC
                LIMIT 1
            `, [leagueId, season]);

            const topAssister = db.get(`
                SELECT p.name, ps.goals_assists
                FROM V3_Player_Stats ps
                JOIN V3_Players p ON ps.player_id = p.player_id
                WHERE ps.league_id = ? AND ps.season_year = ?
                ORDER BY ps.goals_assists DESC
                LIMIT 1
            `, [leagueId, season]);

            const bestPlayer = db.get(`
                SELECT p.name, ps.games_rating
                FROM V3_Player_Stats ps
                JOIN V3_Players p ON ps.player_id = p.player_id
                WHERE ps.league_id = ? AND ps.season_year = ? AND ps.games_appearences >= 10
                ORDER BY CAST(ps.games_rating AS FLOAT) DESC
                LIMIT 1
            `, [leagueId, season]);

            hallOfFame = { winner, topScorer, topAssister, bestPlayer };
        }

        // 3. Standings
        let standings = [];
        if (leagueInfo.imported_standings) {
            standings = db.all(`
                SELECT 
                    s.*, t.name as team_name, t.logo_url as team_logo
                FROM V3_Standings s
                JOIN V3_Teams t ON s.team_id = t.team_id
                WHERE s.league_id = ? AND s.season_year = ?
                ORDER BY s.rank ASC
            `, [leagueId, season]);
        } else {
            // Simulated fallback
            standings = db.all(`
                SELECT 
                    t.team_id, t.name as team_name, t.logo_url as team_logo,
                    COUNT(DISTINCT ps.player_id) as squad_size,
                    SUM(ps.goals_total) as total_goals,
                    SUM(ps.goals_assists) as total_assists,
                    SUM(ps.goals_conceded) as total_conceded,
                    MAX(ps.games_appearences) as played
                FROM V3_Player_Stats ps
                JOIN V3_Teams t ON ps.team_id = t.team_id
                WHERE ps.league_id = ? AND ps.season_year = ?
                GROUP BY t.team_id
                ORDER BY total_goals DESC
            `, [leagueId, season]);
        }

        // 4. Leaderboards (Top Scorers, etc.)
        const topScorers = db.all(`
            SELECT p.player_id, p.name as player_name, p.photo_url, t.name as team_name, t.logo_url as team_logo, ps.goals_total, ps.games_appearences as appearances
            FROM V3_Player_Stats ps
            JOIN V3_Players p ON ps.player_id = p.player_id
            JOIN V3_Teams t ON ps.team_id = t.team_id
            WHERE ps.league_id = ? AND ps.season_year = ?
            ORDER BY ps.goals_total DESC
            LIMIT 5
        `, [leagueId, season]);

        const topAssists = db.all(`
            SELECT p.player_id, p.name as player_name, p.photo_url, t.name as team_name, t.logo_url as team_logo, ps.goals_assists, ps.games_appearences as appearances
            FROM V3_Player_Stats ps
            JOIN V3_Players p ON ps.player_id = p.player_id
            JOIN V3_Teams t ON ps.team_id = t.team_id
            WHERE ps.league_id = ? AND ps.season_year = ?
            ORDER BY ps.goals_assists DESC
            LIMIT 5
        `, [leagueId, season]);

        const topRated = db.all(`
            SELECT p.player_id, p.name as player_name, p.photo_url, t.name as team_name, t.logo_url as team_logo, ps.games_rating, ps.games_appearences as appearances
            FROM V3_Player_Stats ps
            JOIN V3_Players p ON ps.player_id = p.player_id
            JOIN V3_Teams t ON ps.team_id = t.team_id
            WHERE ps.league_id = ? AND ps.season_year = ? AND ps.games_rating IS NOT NULL
            ORDER BY CAST(ps.games_rating AS FLOAT) DESC
            LIMIT 5
        `, [leagueId, season]);

        // 5. Available Years
        const availableYears = db.all(`
            SELECT season_year FROM V3_League_Seasons WHERE league_id = ? ORDER BY season_year DESC
        `, [leagueId]).map(y => y.season_year);

        res.json({
            league: leagueInfo,
            isFinished,
            hallOfFame,
            standings,
            topScorers,
            topAssists,
            topRated,
            availableYears
        });

    } catch (error) {
        console.error("Error fetching V3 Season Overview:", error);
        res.status(500).json({ error: "Failed to fetch season overview" });
    }
};


/**
 * Get all players for a season with optional filters
 * GET /api/v3/league/:id/season/:year/players?teamId=X&position=Y
 */
export const getSeasonPlayers = async (req, res) => {
    try {
        const { id: leagueId, year } = req.params;
        const { teamId, position, sortBy = 'goals', order = 'DESC' } = req.query;

        console.log(`🔍 getSeasonPlayers: leagueId=${leagueId}, year=${year}, teamId=${teamId}, position=${position}, sortBy=${sortBy}, order=${order}`);

        const validColumns = {
            name: 'p.name',
            team: 't.name',
            pos: 'ps.games_position',
            apps: 'ps.games_appearences',
            mins: 'ps.games_minutes',
            goals: 'ps.goals_total',
            assists: 'ps.goals_assists',
            yellow: 'ps.cards_yellow',
            red: 'ps.cards_red',
            rating: 'ps.games_rating'
        };

        const sortCol = validColumns[sortBy] || 'ps.goals_total';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let sql = `
            SELECT 
                p.player_id, p.name, p.photo_url, ps.games_position as position,
                ps.games_appearences as appearances, ps.games_lineups as lineups,
                ps.games_minutes as minutes, ps.goals_total as goals, ps.goals_assists as assists,
                ps.cards_yellow as yellow, ps.cards_red as red, ps.games_rating as rating,
                t.team_id, t.name as team_name, t.logo_url as team_logo
            FROM V3_Player_Stats ps
            JOIN V3_Players p ON ps.player_id = p.player_id
            JOIN V3_Teams t ON ps.team_id = t.team_id
            WHERE ps.league_id = ? AND ps.season_year = ?
        `;
        const params = [leagueId, year];

        if (teamId) {
            sql += ` AND ps.team_id = ?`;
            params.push(teamId);
        }

        if (position && position !== 'ALL') {
            sql += ` AND ps.games_position = ?`;
            params.push(position);
        }

        sql += ` ORDER BY ${sortCol} ${sortOrder}, ps.games_appearences DESC`;

        console.log(`📡 Executing SQL for season players...`);
        const players = db.all(sql, cleanParams(params));
        res.json(players);
    } catch (error) {
        console.error("❌ Error fetching season players:", error);
        res.status(500).json({ error: "Failed to fetch players", details: error.message });
    }
};

/**
 * Get Team Squad for a specific season
 * GET /api/v3/league/:leagueId/season/:year/team/:teamId/squad
 */
export const getTeamSquad = async (req, res) => {
    try {
        const { leagueId, year, teamId } = req.params;
        const squad = db.all(`
            SELECT 
                p.player_id, p.name, p.firstname, p.lastname, p.age, p.photo_url,
                ps.games_position as position,
                ps.games_appearences as appearances,
                ps.games_minutes as minutes,
                ps.goals_total as goals,
                ps.goals_assists as assists,
                ps.games_rating as rating
            FROM V3_Player_Stats ps
            JOIN V3_Players p ON ps.player_id = p.player_id
            WHERE ps.league_id = ? AND ps.season_year = ? AND ps.team_id = ?
            ORDER BY 
                CASE ps.games_position 
                    WHEN 'Goalkeeper' THEN 1 
                    WHEN 'Defender' THEN 2 
                    WHEN 'Midfielder' THEN 3 
                    WHEN 'Attacker' THEN 4 
                    ELSE 5 
                END ASC, ps.games_appearences DESC
        `, [leagueId, year, teamId]);
        res.json(squad);
    } catch (error) {
        console.error("Error fetching team squad:", error);
        res.status(500).json({ error: "Failed to fetch team squad" });
    }
};
import StatsEngine from '../../services/v3/StatsEngine.js';

/**
 * Get Dynamic Standings for a specific range of rounds
 * GET /api/v3/standings/dynamic?league_id=X&season=Y&from_round=1&to_round=5
 */
export const getDynamicStandings = async (req, res) => {
    try {
        const { league_id, season, from_round, to_round } = req.query;

        if (!league_id || !season) {
            return res.status(400).json({ error: "Missing league_id or season year" });
        }

        console.log(`📊 Fetching Dynamic Standings for League ${league_id}, Season ${season}, Rounds ${from_round}-${to_round}`);

        // Currently logic is in the service file we just created
        // But wait, the previous code block didn't import the service yet.
        // I need to add import at top and method here.

        const table = await StatsEngine.getDynamicStandings(league_id, season, parseInt(from_round) || 1, parseInt(to_round) || 50);
        res.json(table);

    } catch (error) {
        console.error("Error fetching dynamic standings:", error);
        res.status(500).json({ error: "Failed to fetch standings" });
    }
};
