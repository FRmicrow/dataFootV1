import db from '../../config/database.js';

/**
 * V3 Search & Club Profile Controller
 * Feature 27 - Local DB only
 */

// Helper: clean params for sql.js
const cleanParams = (params) => params.map(p => (p === undefined || p === null) ? null : p);

/**
 * GET /api/v3/search?q=term&type=all|player|club&country=France
 */
export const searchV3 = async (req, res) => {
    try {
        const { q, type = 'all', country } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({ error: "Search term must be at least 2 characters." });
        }

        const searchTerm = `%${q}%`;
        let players = [];
        let clubs = [];

        // --- Players ---
        if (type === 'all' || type === 'player') {
            let playerSql = `
                SELECT p.player_id, p.name, p.firstname, p.lastname, p.photo_url, p.nationality, p.age,
                       COALESCE(c.importance_rank, 999) as country_rank,
                       c.flag_url as nationality_flag
                FROM V3_Players p
                LEFT JOIN V3_Countries c ON p.nationality = c.name
                WHERE (p.name LIKE ? OR p.firstname LIKE ? OR p.lastname LIKE ?)
            `;
            const playerParams = [searchTerm, searchTerm, searchTerm];

            if (country) {
                playerSql += ` AND p.nationality = ?`;
                playerParams.push(country);
            }

            playerSql += ` ORDER BY c.importance_rank ASC, p.name ASC LIMIT 20`;
            players = db.all(playerSql, cleanParams(playerParams));
        }

        // --- Clubs ---
        if (type === 'all' || type === 'club') {
            let clubSql = `
                SELECT t.team_id, t.api_id, t.name, t.logo_url, t.country, t.founded,
                       COALESCE(c.importance_rank, 999) as country_rank,
                       c.flag_url as country_flag
                FROM V3_Teams t
                LEFT JOIN V3_Countries c ON t.country = c.name
                WHERE t.name LIKE ? AND (t.is_national_team = 0 OR t.is_national_team IS NULL)
            `;
            const clubParams = [searchTerm];

            if (country) {
                clubSql += ` AND t.country = ?`;
                clubParams.push(country);
            }

            clubSql += ` ORDER BY c.importance_rank ASC, t.name ASC LIMIT 20`;
            clubs = db.all(clubSql, cleanParams(clubParams));
        }

        res.json({ players, clubs });
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/club/:id?year=2023
 */
export const getClubProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const requestedYear = req.query.year ? parseInt(req.query.year) : null;

        // 1. Club info + Venue
        const club = db.get(`
            SELECT 
                t.team_id, t.api_id, t.name, t.logo_url, t.country, t.founded, t.code,
                v.name as venue_name, v.city as venue_city, v.capacity as venue_capacity, 
                v.image_url as venue_image, v.surface as venue_surface
            FROM V3_Teams t
            LEFT JOIN V3_Venues v ON t.venue_id = v.venue_id
            WHERE t.team_id = ?
        `, cleanParams([id]));

        if (!club) {
            return res.status(404).json({ error: "Club not found" });
        }

        // 2. Seasons overview: aggregate from V3_Player_Stats
        const seasons = db.all(`
            SELECT 
                ps.season_year,
                ps.league_id,
                l.name as league_name,
                l.logo_url as league_logo,
                COUNT(DISTINCT ps.player_id) as squad_size,
                SUM(ps.games_appearences) as total_appearances,
                SUM(ps.goals_total) as total_goals,
                SUM(ps.goals_assists) as total_assists,
                ROUND(AVG(CASE WHEN ps.games_rating IS NOT NULL AND ps.games_rating != '' THEN CAST(ps.games_rating AS REAL) END), 2) as avg_rating
            FROM V3_Player_Stats ps
            JOIN V3_Leagues l ON ps.league_id = l.league_id
            WHERE ps.team_id = ?
            GROUP BY ps.season_year, ps.league_id
            ORDER BY ps.season_year DESC, l.name ASC
        `, cleanParams([id]));

        // 3. Determine roster year
        const latestYear = seasons.length > 0 ? seasons[0].season_year : null;
        const rosterYear = requestedYear || latestYear;

        // 4. Roster for selected year
        let roster = [];
        if (rosterYear) {
            roster = db.all(`
                SELECT 
                    p.player_id, p.name, p.firstname, p.lastname, p.photo_url, p.nationality, p.age,
                    ps.games_position as position,
                    ps.games_appearences as appearances,
                    ps.goals_total as goals,
                    ps.goals_assists as assists,
                    ps.games_rating as rating,
                    ps.games_minutes as minutes,
                    ps.cards_yellow as yellow_cards,
                    ps.cards_red as red_cards,
                    l.name as league_name
                FROM V3_Player_Stats ps
                JOIN V3_Players p ON ps.player_id = p.player_id
                JOIN V3_Leagues l ON ps.league_id = l.league_id
                WHERE ps.team_id = ? AND ps.season_year = ?
                ORDER BY 
                    CASE ps.games_position 
                        WHEN 'Goalkeeper' THEN 1 
                        WHEN 'Defender' THEN 2 
                        WHEN 'Midfielder' THEN 3 
                        WHEN 'Attacker' THEN 4 
                        ELSE 5 
                    END,
                    ps.games_appearences DESC
            `, cleanParams([id, rosterYear]));
        }

        // 5. Available years for year selector
        const availableYears = [...new Set(seasons.map(s => s.season_year))].sort((a, b) => b - a);

        res.json({
            club,
            seasons,
            roster,
            rosterYear,
            availableYears
        });
    } catch (error) {
        console.error("Club profile error:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/search/countries
 * Returns distinct country names for the country filter dropdown
 */
export const getSearchCountries = async (req, res) => {
    try {
        const countries = db.all(`
            SELECT DISTINCT t.country as name, 
                   COALESCE(c.importance_rank, 999) as importance_rank,
                   c.flag_url
            FROM V3_Teams t
            LEFT JOIN V3_Countries c ON t.country = c.name
            WHERE t.country IS NOT NULL AND t.country != '' 
            ORDER BY COALESCE(c.importance_rank, 999) ASC, t.country ASC
        `);
        res.json(countries);
    } catch (error) {
        console.error("Error fetching search countries:", error);
        res.status(500).json({ error: error.message });
    }
};
