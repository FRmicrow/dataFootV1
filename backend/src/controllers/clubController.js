import db from '../config/database.js';

/**
 * Get club details by ID
 */
export const getClubDetails = (req, res) => {
    try {
        const { clubId } = req.params;

        const club = db.get(`
            SELECT 
                c.club_id,
                c.club_name,
                c.club_logo_url,
                c.country_id,
                c.city,
                c.stadium_name,
                c.stadium_capacity,
                c.founded_year,
                co.country_name,
                co.flag_url as country_flag
            FROM V2_clubs c
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            WHERE c.club_id = ?
        `, [clubId]);

        if (!club) {
            return res.status(404).json({ error: 'Club not found' });
        }

        res.json(club);
    } catch (error) {
        console.error('Error fetching club details:', error);
        res.status(500).json({ error: 'Failed to fetch club details' });
    }
};

/**
 * Get all players for a club with aggregated stats
 */
export const getClubPlayers = (req, res) => {
    try {
        const { clubId } = req.params;
        const {
            page = 1,
            limit = 20,
            sort_by = 'arrival_date',
            sort_order = 'ASC'
        } = req.query;

        // Validate sort parameters
        const validSortColumns = [
            'arrival_date',
            'departure_date',
            'total_matches',
            'total_goals',
            'total_assists',
            'player_name'
        ];
        const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'arrival_date';
        const sortOrder = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        // Get total count
        const countResult = db.get(`
            SELECT COUNT(DISTINCT p.player_id) as total
            FROM V2_players p
            INNER JOIN V2_player_statistics ps ON p.player_id = ps.player_id
            WHERE ps.club_id = ?
        `, [clubId]);

        const total = countResult.total;
        const offset = (page - 1) * limit;
        const totalPages = Math.ceil(total / limit);

        // Build sort clause
        let orderByClause = '';
        switch (sortBy) {
            case 'player_name':
                orderByClause = `p.last_name ${sortOrder}, p.first_name ${sortOrder}`;
                break;
            case 'arrival_date':
                orderByClause = `arrival_date ${sortOrder}`;
                break;
            case 'departure_date':
                orderByClause = `departure_date ${sortOrder}`;
                break;
            case 'total_matches':
                orderByClause = `total_matches ${sortOrder}`;
                break;
            case 'total_goals':
                orderByClause = `total_goals ${sortOrder}`;
                break;
            case 'total_assists':
                orderByClause = `total_assists ${sortOrder}`;
                break;
            default:
                orderByClause = `arrival_date ${sortOrder}`;
        }

        // Main query with aggregated stats
        // Use subqueries to avoid JOIN duplication issues
        const players = db.all(`
            SELECT 
                p.player_id,
                p.first_name,
                p.last_name,
                p.photo_url,
                p.position,
                COALESCE(
                    (SELECT year_start 
                     FROM V2_player_club_history 
                     WHERE player_id = p.player_id AND club_id = ?
                     ORDER BY year_start ASC
                     LIMIT 1),
                    MIN(ps.year)
                ) as arrival_date,
                COALESCE(
                    (SELECT year_end 
                     FROM V2_player_club_history 
                     WHERE player_id = p.player_id AND club_id = ?
                     ORDER BY year_end DESC
                     LIMIT 1),
                    MAX(ps.year)
                ) as departure_date,
                SUM(ps.matches_played) as total_matches,
                SUM(ps.goals) as total_goals,
                SUM(ps.assists) as total_assists,
                SUM(ps.yellow_cards) as total_yellow_cards,
                SUM(ps.red_cards) as total_red_cards
            FROM V2_players p
            INNER JOIN V2_player_statistics ps ON p.player_id = ps.player_id
            WHERE ps.club_id = ?
            GROUP BY p.player_id
            ORDER BY ${orderByClause}
            LIMIT ? OFFSET ?
        `, [clubId, clubId, clubId, limit, offset]);

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
        console.error('Error fetching club players:', error);
        res.status(500).json({ error: 'Failed to fetch club players' });
    }
};

/**
 * Get detailed stats for a specific player at a specific club
 * Breakdown by year and competition
 */
export const getPlayerClubDetails = (req, res) => {
    try {
        const { clubId, playerId } = req.params;

        const stats = db.all(`
            SELECT 
                ps.stat_id,
                ps.season,
                ps.year,
                ps.competition_id,
                comp.competition_name,
                ps.matches_played,
                ps.goals,
                ps.assists,
                ps.yellow_cards,
                ps.red_cards,
                ps.matches_started,
                ps.minutes_played
            FROM V2_player_statistics ps
            LEFT JOIN V2_competitions comp ON ps.competition_id = comp.competition_id
            WHERE ps.player_id = ? AND ps.club_id = ?
            ORDER BY ps.year DESC, comp.competition_name ASC
        `, [playerId, clubId]);

        res.json(stats);
    } catch (error) {
        console.error('Error fetching player club details:', error);
        res.status(500).json({ error: 'Failed to fetch player details' });
    }
};

/**
 * Get a club's competition history by year
 */
export const getClubHistory = (req, res) => {
    try {
        const { clubId } = req.params;

        const history = db.all(`
            SELECT 
                ps.season,
                ps.year,
                comp.competition_name,
                comp.competition_id,
                COUNT(DISTINCT ps.player_id) as squad_size,
                SUM(ps.goals) as total_goals,
                SUM(ps.assists) as total_assists
            FROM V2_player_statistics ps
            LEFT JOIN V2_competitions comp ON ps.competition_id = comp.competition_id
            WHERE ps.club_id = ?
            GROUP BY ps.year, ps.competition_id
            ORDER BY ps.year DESC, comp.competition_name ASC
        `, [clubId]);

        res.json(history);
    } catch (error) {
        console.error('Error fetching club history:', error);
        res.status(500).json({ error: 'Failed to fetch club history' });
    }
};

/**
 * Get club's trophy cabinet
 */
export const getClubTrophies = (req, res) => {
    try {
        const { clubId } = req.params;

        const trophies = db.all(`
            SELECT 
                ct.*,
                comp.competition_name,
                comp.competition_logo_url,
                comp.level as competition_level
            FROM V2_club_trophies ct
            LEFT JOIN V2_competitions comp ON ct.competition_id = comp.competition_id
            WHERE ct.club_id = ?
            ORDER BY ct.year DESC
        `, [clubId]);

        res.json(trophies);
    } catch (error) {
        console.error('Error fetching club trophies:', error);
        res.status(500).json({ error: 'Failed to fetch club trophies' });
    }
};
