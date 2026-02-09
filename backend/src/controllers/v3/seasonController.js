import dbV3 from '../../config/database_v3.js';

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

        console.log(`📊 Fetching V3 Season Overview for League ${leagueId}, Season ${season}`);

        // 1. Fetch League Metadata
        const leagueInfo = dbV3.get(`
            SELECT 
                l.league_id, l.name as league_name, l.logo_url, l.type,
                c.name as country_name, c.flag_url,
                ls.season_year, ls.start_date, ls.end_date
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_League_Seasons ls ON l.league_id = ls.league_id
            WHERE l.league_id = ? AND ls.season_year = ?
        `, [leagueId, season]);

        if (!leagueInfo) {
            return res.status(404).json({ error: "League/Season not found in V3 database" });
        }

        // 2. Simulated Standings (Aggregated by Team)
        // Note: casting boolean to integer for sqlite sum if needed, but goals are integers
        const standings = dbV3.all(`
            SELECT 
                t.team_id, 
                t.name as team_name, 
                t.logo_url as team_logo,
                COUNT(DISTINCT ps.player_id) as squad_size,
                SUM(ps.goals_total) as total_goals,
                SUM(ps.goals_assists) as total_assists,
                SUM(ps.goals_conceded) as total_conceded,
                SUM(ps.cards_yellow) as total_yellow,
                SUM(ps.cards_red) as total_red,
                MAX(ps.games_appearences) as estimated_matches_played
            FROM V3_Player_Stats ps
            JOIN V3_Teams t ON ps.team_id = t.team_id
            WHERE ps.league_id = ? AND ps.season_year = ?
            GROUP BY t.team_id
            ORDER BY total_goals DESC, total_assists DESC
        `, [leagueId, season]);

        // 3. Top Scorers
        const topScorers = dbV3.all(`
            SELECT 
                p.player_id, 
                p.name as player_name, 
                p.photo_url, 
                t.name as team_name, 
                t.logo_url as team_logo,
                ps.goals_total,
                ps.games_appearences as appearances,
                ps.games_minutes as minutes
            FROM V3_Player_Stats ps
            JOIN V3_Players p ON ps.player_id = p.player_id
            JOIN V3_Teams t ON ps.team_id = t.team_id
            WHERE ps.league_id = ? AND ps.season_year = ?
            ORDER BY ps.goals_total DESC, ps.goals_assists DESC
            LIMIT 5
        `, [leagueId, season]);

        // 4. Top Assists
        const topAssists = dbV3.all(`
            SELECT 
                p.player_id, 
                p.name as player_name, 
                p.photo_url, 
                t.name as team_name, 
                t.logo_url as team_logo,
                ps.goals_assists,
                ps.goals_total,
                ps.games_appearences as appearances
            FROM V3_Player_Stats ps
            JOIN V3_Players p ON ps.player_id = p.player_id
            JOIN V3_Teams t ON ps.team_id = t.team_id
            WHERE ps.league_id = ? AND ps.season_year = ?
            ORDER BY ps.goals_assists DESC, ps.goals_total DESC
            LIMIT 5
        `, [leagueId, season]);

        // 5. Available Years for this League
        const availableYears = dbV3.all(`
            SELECT season_year 
            FROM V3_League_Seasons 
            WHERE league_id = ? AND imported_players = 1
            ORDER BY season_year DESC
        `, [leagueId]).map(y => y.season_year);

        res.json({
            league: leagueInfo,
            standings: standings,
            topScorers: topScorers,
            topAssists: topAssists,
            availableYears: availableYears
        });

    } catch (error) {
        console.error("Error fetching V3 Season Overview:", error);
        res.status(500).json({ error: "Failed to fetch season overview" });
    }
};

/**
 * Get Team Squad for a specific season
 * GET /api/v3/league/:leagueId/season/:year/team/:teamId/squad
 */
export const getTeamSquad = async (req, res) => {
    try {
        const { leagueId, year, teamId } = req.params;
        const squad = dbV3.all(`
            SELECT 
                p.player_id, p.name, p.firstname, p.lastname, p.age, p.photo_url,
                ps.games_position as position,
                ps.games_appearences as appearances,
                ps.goals_total as goals
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
                END ASC, p.name ASC
        `, [leagueId, year, teamId]);
        res.json(squad);
    } catch (error) {
        console.error("Error fetching team squad:", error);
        res.status(500).json({ error: "Failed to fetch team squad" });
    }
};
