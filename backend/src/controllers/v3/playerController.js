import dbV3 from '../../config/database_v3.js';

/**
 * Player Controller for V3 POC
 */

export const getPlayerProfileV3 = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch Player Basic Info
        const player = dbV3.get(`
            SELECT p.*, c3.flag_url as nationality_flag 
            FROM V3_Players p
            LEFT JOIN V3_Countries c3 ON p.nationality = c3.name
            WHERE p.player_id = ?
        `, [id]);

        if (!player) {
            return res.status(404).json({ error: "Player not found in V3 database. Please import league data first." });
        }

        // 2. Fetch Career Stats with Team and League details
        const stats = dbV3.all(`
            SELECT 
                ps.*,
                t.name as team_name, t.logo_url as team_logo,
                l.name as league_name, l.logo_url as league_logo, l.type as league_type,
                c3.name as country_name, 
                c3.flag_url as country_flag
            FROM V3_Player_Stats ps
            JOIN V3_Teams t ON ps.team_id = t.team_id
            JOIN V3_Leagues l ON ps.league_id = l.league_id
            LEFT JOIN V3_Countries c3 ON l.country_id = c3.country_id
            WHERE ps.player_id = ?
            ORDER BY ps.season_year DESC, l.type ASC
        `, [id]);

        // 3. Aggregate Stats by Club (US-010)
        const aggregatedStats = stats.reduce((acc, curr) => {
            const teamId = curr.team_id;
            if (!acc[teamId]) {
                acc[teamId] = {
                    team_id: teamId,
                    team_name: curr.team_name,
                    team_logo: curr.team_logo,
                    total_matches: 0,
                    total_goals: 0,
                    total_assists: 0,
                    total_rating: 0,
                    rating_count: 0
                };
            }
            acc[teamId].total_matches += (curr.games_appearences || 0);
            acc[teamId].total_goals += (curr.goals_total || 0);
            acc[teamId].total_assists += (curr.goals_assists || 0);
            if (curr.games_rating) {
                acc[teamId].total_rating += (parseFloat(curr.games_rating) * (curr.games_appearences || 1));
                acc[teamId].rating_count += (curr.games_appearences || 1);
            }
            return acc;
        }, {});

        // Calculate avg ratings
        const clubTotals = Object.values(aggregatedStats).map(club => ({
            ...club,
            avg_rating: club.rating_count > 0 ? (club.total_rating / club.rating_count).toFixed(2) : 'N/A'
        }));

        res.json({
            player,
            career: stats,
            clubTotals: clubTotals
        });
    } catch (error) {
        console.error("Error fetching V3 Player Profile:", error);
        res.status(500).json({ error: "Failed to fetch player profile" });
    }
};
