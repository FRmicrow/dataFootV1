import db from '../config/database.js';
import footballApi from '../services/footballApi.js';

/**
 * Player Controller - V2 Schema Only
 * All endpoints use V2_* tables
 */

/**
 * Search players with filters
 * Requires at least one search parameter: name, nationality, or club
 */
export const getAllPlayers = (req, res) => {
    try {
        const { name, nationality, club } = req.query;

        // Require at least one search parameter
        if (!name && !nationality && !club) {
            return res.json({ players: [], message: 'Please provide at least one search criteria' });
        }

        let whereClauses = [];
        let params = [];

        // Build WHERE clauses based on provided filters
        if (name && name.trim()) {
            whereClauses.push(`(p.first_name LIKE ? OR p.last_name LIKE ?)`);
            const searchTerm = `%${name.trim()}%`;
            params.push(searchTerm, searchTerm);
        }

        if (nationality && nationality !== 'all') {
            whereClauses.push(`nat.country_id = ?`);
            params.push(nationality);
        }

        if (club && club.trim()) {
            whereClauses.push(`lpc.club_name LIKE ?`);
            params.push(`%${club.trim()}%`);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const sql = `
            WITH LatestPlayerClub AS (
                SELECT 
                    ps.player_id,
                    ps.club_id,
                    c.club_name,
                    c.club_logo_url,
                    co.country_name,
                    ps.season,
                    ps.year,
                    ROW_NUMBER() OVER (PARTITION BY ps.player_id ORDER BY ps.year DESC) as rn
                FROM V2_player_statistics ps
                JOIN V2_clubs c ON ps.club_id = c.club_id
                LEFT JOIN V2_countries co ON c.country_id = co.country_id
            )
            SELECT 
                p.player_id as id,
                p.api_id as api_player_id,
                p.first_name,
                p.last_name,
                p.date_of_birth,
                p.nationality_id,
                nat.country_name as nationality,
                p.photo_url,
                p.position,
                lpc.club_name as current_team,
                lpc.club_logo_url,
                lpc.country_name as team_country
            FROM V2_players p
            LEFT JOIN V2_countries nat ON p.nationality_id = nat.country_id
            LEFT JOIN LatestPlayerClub lpc ON p.player_id = lpc.player_id AND lpc.rn = 1
            ${whereClause}
            ORDER BY p.last_name, p.first_name
            LIMIT 100
        `;

        const players = db.all(sql, params);
        res.json({ players, count: players.length });

    } catch (error) {
        console.error('❌ Error searching players:', error.message);
        res.status(500).json({
            error: 'Failed to search players',
            details: error.message
        });
    }
};

/**
 * Get player detail by ID
 */
export const getPlayerDetail = (req, res) => {
    const { id } = req.params;

    try {
        // Get player basic info
        const player = db.get(`
            SELECT 
                p.*,
                nat.country_name as nationality,
                nat.country_code as nationality_code
            FROM V2_players p
            LEFT JOIN V2_countries nat ON p.nationality_id = nat.country_id
            WHERE p.player_id = ?
        `, [id]);

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Get extended statistics for categorization
        const allStats = db.all(`
            SELECT 
                ps.*,
                c.club_name,
                c.club_logo_url,
                co.country_name as club_country,
                comp.competition_name,
                comp.competition_id, comp.api_id as competition_api_id,
                comp.trophy_type_id,
                tt.type_name as competition_type
            FROM V2_player_statistics ps
            JOIN V2_clubs c ON ps.club_id = c.club_id
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            LEFT JOIN V2_competitions comp ON ps.competition_id = comp.competition_id
            LEFT JOIN V2_trophy_type tt ON comp.trophy_type_id = tt.trophy_type_id
            WHERE ps.player_id = ?
            ORDER BY ps.year DESC, ps.season DESC
        `, [id]);

        const categorized = {
            leagues: [],
            national_cups: [],
            international_cups: [],
            national_team: [],
            under_23: []
        };

        allStats.forEach(stat => {
            // 1. U23 / Youth Logic (Highest Priority)
            const isU23Team = /U23|U21|U19|Reserve|Youth/i.test(stat.club_name);
            const isU23Comp = /U23|U21|U19|Youth/i.test(stat.competition_name || '');

            if (isU23Team || isU23Comp) {
                categorized.under_23.push(stat);
                return;
            }

            const ttid = stat.trophy_type_id;

            // 2. National Team Categorization
            // IDs: 2 (UEFA NT), 4 (FIFA NT), 6 (Continental NT)
            if ([2, 4, 6].includes(ttid)) {
                categorized.national_team.push(stat);
                return;
            }

            // 3. International Cup Categorization
            // IDs: 1 (UEFA Club), 3 (FIFA Club), 5 (Continental Club)
            if ([1, 3, 5].includes(ttid)) {
                categorized.international_cups.push(stat);
                return;
            }

            // 4. National Cup Categorization (Domestic Cup, Super Cup, League Cup)
            // IDs: 8 (Domestic Cup), 9 (Domestic Super Cup), 10 (Domestic League Cup)
            if ([8, 9, 10].includes(ttid)) {
                categorized.national_cups.push(stat);
                return;
            }

            // 5. Domestic Leagues & Fallback
            // ID: 7 (Domestic League) or missing
            if (stat.competition_id && !stat.competition_type) {
                console.warn(`⚠️ Competition [${stat.competition_name}] (ID: ${stat.competition_id}) has no trophy_type defined in DB.`);
            }
            categorized.leagues.push(stat);
        });

        // Get trophies
        const trophiesList = db.all(`
            SELECT 
                pt.*,
                c.club_name,
                comp.competition_name as trophy_name,
                tt.type_name as competition_type,
                tt.trophy_type_id
            FROM V2_player_trophies pt
            LEFT JOIN V2_clubs c ON pt.club_id = c.club_id
            LEFT JOIN V2_competitions comp ON pt.competition_id = comp.competition_id
            LEFT JOIN V2_trophy_type tt ON comp.trophy_type_id = tt.trophy_type_id
            WHERE pt.player_id = ?
            ORDER BY pt.season DESC
        `, [id]);

        // Get individual awards
        const awards = db.all(`
            SELECT 
                pia.*,
                ia.award_name,
                ia.award_type
            FROM V2_player_individual_awards pia
            JOIN V2_individual_awards ia ON pia.award_id = ia.award_id
            WHERE pia.player_id = ?
            ORDER BY pia.season DESC
        `, [id]);

        // Group by club and season for backward compatibility
        const clubsMap = {};
        allStats.forEach(stat => {
            const clubKey = `${stat.club_id}_${stat.season}`;
            if (!clubsMap[clubKey]) {
                clubsMap[clubKey] = {
                    club_id: stat.club_id,
                    club_name: stat.club_name,
                    club_logo: stat.club_logo_url,
                    country: stat.club_country,
                    season: stat.season,
                    competitions: []
                };
            }

            clubsMap[clubKey].competitions.push({
                competition_id: stat.competition_id,
                competition_name: stat.competition_name || 'Unknown',
                matches: stat.matches_played,
                goals: stat.goals,
                assists: stat.assists,
                yellow_cards: stat.yellow_cards,
                red_cards: stat.red_cards,
                minutes: stat.minutes_played
            });
        });

        const clubs = Object.values(clubsMap);

        res.json({
            player,
            stats: categorized,
            clubs, // Restored grouped format
            trophies: trophiesList,
            awards
        });

    } catch (error) {
        console.error('❌ Error getting player detail:', error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get team/club detail by ID
 */
export const getTeamDetail = (req, res) => {
    const { id } = req.params;

    try {
        const team = db.get(`
            SELECT 
                c.*,
                co.country_name,
                co.country_code
            FROM V2_clubs c
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            WHERE c.club_id = ?
        `, [id]);

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Get team trophies
        const trophies = db.all(`
            SELECT 
                ct.*,
                comp.competition_name as trophy_name
            FROM V2_club_trophies ct
            JOIN V2_competitions comp ON ct.competition_id = comp.competition_id
            WHERE ct.club_id = ?
            ORDER BY ct.season DESC
        `, [id]);

        res.json({
            team,
            trophies
        });

    } catch (error) {
        console.error('❌ Error getting team detail:', error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Search players
 */
export const searchPlayers = (req, res) => {
    const { query } = req.query;

    if (!query || query.length < 2) {
        return res.json({ players: [] });
    }

    try {
        const searchTerm = `%${query}%`;
        const players = db.all(`
            SELECT 
                p.player_id as id,
                p.first_name,
                p.last_name,
                p.photo_url,
                p.position,
                nat.country_name as nationality
            FROM V2_players p
            LEFT JOIN V2_countries nat ON p.nationality_id = nat.country_id
            WHERE p.first_name LIKE ? OR p.last_name LIKE ?
            ORDER BY p.last_name, p.first_name
            LIMIT 50
        `, [searchTerm, searchTerm]);

        res.json({ players });

    } catch (error) {
        console.error('❌ Error searching players:', error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get team statistics for a specific season
 */
export const getTeamSeasonStats = (req, res) => {
    const { id, season } = req.params;

    try {
        const stats = db.all(`
            SELECT 
                p.player_id,
                p.first_name,
                p.last_name,
                p.photo_url,
                p.position,
                ps.matches_played,
                ps.goals,
                ps.assists,
                ps.yellow_cards,
                ps.red_cards,
                ps.minutes_played,
                comp.competition_name
            FROM V2_player_statistics ps
            JOIN V2_players p ON ps.player_id = p.player_id
            LEFT JOIN V2_competitions comp ON ps.competition_id = comp.competition_id
            WHERE ps.club_id = ? AND ps.season = ?
            ORDER BY ps.matches_played DESC, ps.goals DESC
        `, [id, season]);

        res.json({ stats });

    } catch (error) {
        console.error('❌ Error getting team season stats:', error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete player (admin only)
 */
export const deletePlayer = (req, res) => {
    const { id } = req.params;

    try {
        const player = db.get('SELECT player_id FROM V2_players WHERE player_id = ?', [id]);

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Delete related records
        db.run('DELETE FROM V2_player_statistics WHERE player_id = ?', [id]);
        db.run('DELETE FROM V2_player_trophies WHERE player_id = ?', [id]);
        db.run('DELETE FROM V2_player_individual_awards WHERE player_id = ?', [id]);
        db.run('DELETE FROM V2_player_club_history WHERE player_id = ?', [id]);
        db.run('DELETE FROM V2_players WHERE player_id = ?', [id]);

        res.json({ success: true, message: 'Player deleted successfully' });

    } catch (error) {
        console.error('❌ Error deleting player:', error.message);
        res.status(500).json({ error: error.message });
    }
};


/**
 * Get all nationalities (countries with players)
 */
export const getNationalities = (req, res) => {
    try {
        const nationalities = db.all(`
            SELECT DISTINCT
                c.country_id as id,
                c.country_name as name,
                c.country_code as code,
                COUNT(DISTINCT p.player_id) as player_count
            FROM V2_countries c
            JOIN V2_players p ON c.country_id = p.nationality_id
            GROUP BY c.country_id, c.country_name, c.country_code
            ORDER BY c.country_name
        `);

        res.json({ nationalities });

    } catch (error) {
        console.error('❌ Error fetching nationalities:', error.message);
        res.status(500).json({ error: error.message });
    }
};

export default {
    getAllPlayers,
    getNationalities,
    getPlayerDetail,
    getTeamDetail,
    searchPlayers,
    getTeamSeasonStats,
    deletePlayer
};
