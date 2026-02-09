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

        // Group stats by season for easier frontend processing if needed, 
        // but we can also do it on frontend. Let's send raw and grouped by season.
        const career = stats.reduce((acc, curr) => {
            const season = curr.season_year;
            if (!acc[season]) acc[season] = [];
            acc[season].push(curr);
            return acc;
        }, {});

        res.json({
            player,
            career: stats // Sending flat list for flexibility, frontend can group
        });
    } catch (error) {
        console.error("Error fetching V3 Player Profile:", error);
        res.status(500).json({ error: "Failed to fetch player profile" });
    }
};
