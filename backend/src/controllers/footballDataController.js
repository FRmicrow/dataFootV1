import db from '../config/database.js';

/**
 * Search players with filters and pagination
 * Query params: name, nationality_id, club_id, year_from, year_to, page, limit
 */
export const searchPlayers = (req, res) => {
    try {
        const {
            name,
            nationality_id,
            club_id,
            year_from,
            year_to,
            page = 1,
            limit = 20
        } = req.query;

        // Validation: At least one search parameter required
        if (!name && !nationality_id && !club_id && !year_from && !year_to) {
            return res.status(400).json({
                error: 'At least one search parameter is required'
            });
        }

        // Build WHERE clauses
        let whereClauses = [];
        let params = [];

        if (name && name.trim()) {
            whereClauses.push(`(LOWER(p.first_name) LIKE ? OR LOWER(p.last_name) LIKE ?)`);
            const searchTerm = `%${name.trim().toLowerCase()}%`;
            params.push(searchTerm, searchTerm);
        }

        if (nationality_id) {
            whereClauses.push(`p.nationality_id = ?`);
            params.push(nationality_id);
        }

        if (club_id) {
            whereClauses.push(`ps.club_id = ?`);
            params.push(club_id);
        }

        if (year_from) {
            whereClauses.push(`ps.year >= ?`);
            params.push(year_from);
        }

        if (year_to) {
            whereClauses.push(`ps.year <= ?`);
            params.push(year_to);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Get total count for pagination
        const countSql = `
            SELECT COUNT(DISTINCT p.player_id) as total
            FROM V2_players p
            INNER JOIN V2_player_statistics ps ON p.player_id = ps.player_id
            ${whereClause}
        `;
        const countResult = db.get(countSql, params);
        const total = countResult.total;

        // Calculate pagination
        const offset = (page - 1) * limit;
        const totalPages = Math.ceil(total / limit);

        // Main query with sorting and pagination
        const sql = `
            WITH PlayerStats AS (
                SELECT 
                    p.player_id,
                    p.first_name,
                    p.last_name,
                    p.photo_url,
                    p.nationality_id,
                    nat.country_name as nationality,
                    SUM(ps.matches_played) as total_matches,
                    MAX(ps.year) as most_recent_year
                FROM V2_players p
                INNER JOIN V2_player_statistics ps ON p.player_id = ps.player_id
                LEFT JOIN V2_countries nat ON p.nationality_id = nat.country_id
                ${whereClause}
                GROUP BY p.player_id
            )
            SELECT 
                pst.*,
                c.club_name as current_club
            FROM PlayerStats pst
            LEFT JOIN V2_player_statistics ps2 ON pst.player_id = ps2.player_id 
                AND ps2.year = pst.most_recent_year
            LEFT JOIN V2_clubs c ON ps2.club_id = c.club_id
            GROUP BY pst.player_id
            ORDER BY pst.total_matches DESC, pst.most_recent_year DESC
            LIMIT ? OFFSET ?
        `;

        const players = db.all(sql, [...params, limit, offset]);

        res.json({
            players,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Error searching players:', error);
        res.status(500).json({ error: 'Failed to search players' });
    }
};

/**
 * Search clubs with filters and pagination
 * Query params: name, country_id, page, limit
 */
export const searchClubs = (req, res) => {
    try {
        const {
            name,
            country_id,
            page = 1,
            limit = 20
        } = req.query;

        // Build WHERE clauses
        let whereClauses = [];
        let params = [];

        if (name && name.trim()) {
            whereClauses.push(`LOWER(c.club_name) LIKE ?`);
            params.push(`%${name.trim().toLowerCase()}%`);
        }

        if (country_id) {
            whereClauses.push(`c.country_id = ?`);
            params.push(country_id);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Get total count for pagination
        const countSql = `
            SELECT COUNT(DISTINCT c.club_id) as total
            FROM V2_clubs c
            ${whereClause}
        `;
        const countResult = db.get(countSql, params);
        const total = countResult.total;

        // Calculate pagination
        const offset = (page - 1) * limit;
        const totalPages = Math.ceil(total / limit);

        // Main query with current league calculation
        const sql = `
            SELECT 
                c.club_id,
                c.club_name,
                c.club_logo_url,
                c.country_id,
                co.country_name,
                (
                    SELECT comp.competition_name
                    FROM V2_player_statistics ps
                    INNER JOIN V2_competitions comp ON ps.competition_id = comp.competition_id
                    LEFT JOIN V2_trophy_type tt ON comp.trophy_type_id = tt.trophy_type_id
                    WHERE ps.club_id = c.club_id
                    AND ps.year = (
                        SELECT MAX(year) 
                        FROM V2_player_statistics 
                        WHERE club_id = c.club_id
                    )
                    ORDER BY COALESCE(tt.type_order, 999) ASC
                    LIMIT 1
                ) as current_league
            FROM V2_clubs c
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            ${whereClause}
            ORDER BY c.club_name ASC
            LIMIT ? OFFSET ?
        `;

        const clubs = db.all(sql, [...params, limit, offset]);

        res.json({
            clubs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Error searching clubs:', error);
        res.status(500).json({ error: 'Failed to search clubs' });
    }
};

/**
 * Get all countries for dropdown
 */
export const getAllCountries = (req, res) => {
    try {
        const countries = db.all(`
            SELECT country_id, country_name, country_code
            FROM V2_countries
            ORDER BY country_name ASC
        `);

        res.json(countries);
    } catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({ error: 'Failed to fetch countries' });
    }
};

/**
 * Get all clubs for dropdown (with optional search)
 */
export const getAllClubs = (req, res) => {
    try {
        const { search } = req.query;

        let sql = `
            SELECT club_id, club_name, country_id
            FROM V2_clubs
        `;

        let params = [];

        if (search && search.trim()) {
            sql += ` WHERE LOWER(club_name) LIKE ?`;
            params.push(`%${search.trim().toLowerCase()}%`);
        }

        sql += ` ORDER BY club_name ASC LIMIT 100`;

        const clubs = db.all(sql, params);

        res.json(clubs);
    } catch (error) {
        console.error('Error fetching clubs:', error);
        res.status(500).json({ error: 'Failed to fetch clubs' });
    }
};
