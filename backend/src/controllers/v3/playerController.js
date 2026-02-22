import db from '../../config/database.js';

/**
 * Player Controller for V3 POC
 */

export const getPlayerProfileV3 = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch Player Basic Info
        const player = db.get(`
            SELECT p.*, c3.flag_url as nationality_flag 
            FROM V3_Players p
            LEFT JOIN V3_Countries c3 ON p.nationality = c3.name
            WHERE p.player_id = ?
        `, [id]);

        if (!player) {
            return res.status(404).json({ error: "Player not found in V3 database." });
        }

        // 2. Fetch Career Stats with Domestic Territory Resolution (US-093)
        // We join Team Country to resolve domestic domicile vs League Domicile
        const stats = db.all(`
            SELECT
                ps.*,
                t.name as team_name, t.logo_url as team_logo, t.is_national_team,
                t.country as team_country_name,
                tc.flag_url as team_country_flag,
                l.name as league_name, l.logo_url as league_logo, l.type as league_type, l.importance_rank,
                c3.name as league_country_name,
                c3.flag_url as league_country_flag
            FROM V3_Player_Stats ps
            JOIN V3_Teams t ON ps.team_id = t.team_id
            JOIN V3_Leagues l ON ps.league_id = l.league_id
            LEFT JOIN V3_Countries c3 ON l.country_id = c3.country_id
            LEFT JOIN V3_Countries tc ON t.country = tc.name
            WHERE ps.player_id = ?
            ORDER BY ps.season_year DESC, t.is_national_team DESC, l.importance_rank ASC
        `, [id]);

        // 3. Aggregate Stats by Team (US-091)
        const aggregatedStats = stats.reduce((acc, curr) => {
            const teamId = curr.team_id;
            if (!acc[teamId]) {
                acc[teamId] = {
                    team_id: teamId,
                    team_name: curr.team_name,
                    team_logo: curr.team_logo,
                    is_national_team: curr.is_national_team || 0,
                    total_matches: 0,
                    total_goals: 0,
                    total_assists: 0,
                    total_rating_points: 0,
                    rating_count: 0
                };
            }
            acc[teamId].total_matches += (curr.games_appearences || 0);
            acc[teamId].total_goals += (curr.goals_total || 0);
            acc[teamId].total_assists += (curr.goals_assists || 0);

            if (curr.games_rating && curr.games_rating !== 'N/A') {
                const apps = (curr.games_appearences || 1);
                acc[teamId].total_rating_points += (parseFloat(curr.games_rating) * apps);
                acc[teamId].rating_count += apps;
            }
            return acc;
        }, {});

        // Normalize totals and apply High-Prestige Pinning Logic
        const careerTotals = Object.values(aggregatedStats)
            .map(team => ({
                ...team,
                avg_rating: team.rating_count > 0 ? (team.total_rating_points / team.rating_count).toFixed(2) : 'N/A'
            }))
            .sort((a, b) => {
                if (a.is_national_team !== b.is_national_team) return b.is_national_team - a.is_national_team;
                return b.total_matches - a.total_matches;
            });

        // 4. Resolve Current Professional Context (US-090)
        let currentContext = { status: 'Inactive', team: null };
        if (stats.length > 0) {
            const latest = stats[0];
            const currentYear = new Date().getFullYear();
            if (latest.season_year >= currentYear - 1) {
                currentContext = {
                    status: 'Active',
                    team: {
                        id: latest.team_id,
                        name: latest.team_name,
                        logo: latest.team_logo
                    }
                };
            }
        }

        res.json({
            player,
            career: stats,
            careerTotals,
            currentContext
        });
    } catch (error) {
        console.error("Error fetching V3 Player Profile:", error);
        res.status(500).json({ error: "Failed to fetch player profile" });
    }
};

/**
 * GET /api/v3/players/nationalities
 * Return distinct nationalities and count of players
 */
export const getPlayerNationalities = async (req, res) => {
    try {
        const sql = `
            SELECT nationality, COUNT(*) as count 
            FROM V3_Players 
            WHERE nationality IS NOT NULL AND nationality != ''
            GROUP BY nationality 
            ORDER BY count DESC
        `;
        const nationalities = db.all(sql);
        res.json(nationalities);
    } catch (error) {
        console.error("Error fetching player nationalities:", error);
        res.status(500).json({ error: "Failed to fetch nationalities" });
    }
};

/**
 * GET /api/v3/players/by-nationality
 * Return players for a specific nationality with trophy status
 */
export const getPlayersByNationality = async (req, res) => {
    try {
        const { country } = req.query;
        if (!country) {
            return res.status(400).json({ error: "Missing country parameter" });
        }

        const sql = `
            SELECT p.player_id, p.api_id, p.name, p.photo_url, 
                (CASE WHEN t.player_id IS NOT NULL THEN 1 ELSE 0 END) as has_trophies
            FROM V3_Players p
            LEFT JOIN (SELECT DISTINCT player_id FROM V3_Trophies) t ON p.player_id = t.player_id
            WHERE p.nationality = ?
            ORDER BY p.name ASC
        `;
        const players = db.all(sql, [country]);
        res.json(players);
    } catch (error) {
        console.error(`Error fetching players for ${country}:`, error);
        res.status(500).json({ error: `Failed to fetch players for ${country}` });
    }
};
