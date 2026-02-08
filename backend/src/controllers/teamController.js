import db from '../config/database.js';

/**
 * Get leagues metadata (without teams) for lazy loading
 */
export const getLeaguesMetadata = (req, res) => {
    try {
        const { minRank = 40 } = req.query;

        const leagues = db.all(`
            SELECT 
                comp.competition_id,
                comp.competition_name,
                comp.level as league_level,
                co.country_id,
                co.country_name,
                co.importance_rank,
                COUNT(DISTINCT c.club_id) as team_count
            FROM V2_competitions comp
            INNER JOIN V2_countries co ON comp.country_id = co.country_id
            INNER JOIN V2_player_statistics ps ON comp.competition_id = ps.competition_id
            INNER JOIN V2_clubs c ON ps.club_id = c.club_id AND c.country_id = co.country_id
            WHERE co.importance_rank <= ? AND comp.level = 1
            GROUP BY comp.competition_id
            HAVING team_count > 0
            ORDER BY co.importance_rank ASC, comp.competition_name ASC
        `, [minRank]);

        res.json(leagues);
    } catch (error) {
        console.error('Error fetching leagues metadata:', error);
        res.status(500).json({ error: 'Failed to fetch leagues' });
    }
};

/**
 * Get teams for a specific league/competition
 */
export const getTeamsByCompetition = (req, res) => {
    try {
        const { competitionId } = req.params;

        const teams = db.all(`
            SELECT DISTINCT
                c.club_id,
                c.club_name,
                c.club_logo_url,
                c.country_id,
                COUNT(DISTINCT ps.player_id) as player_count
            FROM V2_clubs c
            INNER JOIN V2_player_statistics ps ON c.club_id = ps.club_id
            WHERE ps.competition_id = ?
            GROUP BY c.club_id
            HAVING player_count > 0
            ORDER BY c.club_name ASC
        `, [competitionId]);

        res.json(teams);
    } catch (error) {
        console.error('Error fetching teams for competition:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
};

/**
 * Get teams grouped by league, filtered by country importance
 */
export const getTeamsByLeague = (req, res) => {
    try {
        const { minRank = 40 } = req.query; // Default to top 40 countries

        const teams = db.all(`
            SELECT 
                c.club_id,
                c.club_name,
                c.club_logo_url,
                c.country_id,
                co.country_name,
                co.importance_rank,
                comp.competition_id,
                comp.competition_name,
                comp.level as league_level,
                COUNT(DISTINCT ps.player_id) as player_count
            FROM V2_clubs c
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            LEFT JOIN V2_player_statistics ps ON c.club_id = ps.club_id
            LEFT JOIN V2_competitions comp ON ps.competition_id = comp.competition_id 
                AND comp.country_id = c.country_id 
                AND comp.level = 1
            WHERE co.importance_rank <= ?
            GROUP BY c.club_id, comp.competition_id
            HAVING player_count > 0
            ORDER BY co.importance_rank ASC, comp.level ASC, c.club_name ASC
        `, [minRank]);

        // Group by league
        const grouped = {};
        teams.forEach(team => {
            const leagueKey = team.competition_name || 'Other';
            if (!grouped[leagueKey]) {
                grouped[leagueKey] = {
                    competition_id: team.competition_id,
                    competition_name: team.competition_name,
                    country_name: team.country_name,
                    importance_rank: team.importance_rank,
                    teams: []
                };
            }
            grouped[leagueKey].teams.push(team);
        });

        res.json(Object.values(grouped));
    } catch (error) {
        console.error('Error fetching teams by league:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
};

/**
 * Get team details by ID
 */
export const getTeamById = (req, res) => {
    try {
        const { id } = req.params;

        const team = db.get(`
            SELECT 
                c.*,
                co.country_name,
                co.flag_url as country_flag
            FROM V2_clubs c
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            WHERE c.club_id = ?
        `, [id]);

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        res.json(team);
    } catch (error) {
        console.error('Error fetching team:', error);
        res.status(500).json({ error: 'Failed to fetch team details' });
    }
};

/**
 * Get players for a specific team, with optional year filter
 * Returns only the most recent season for each player
 */
export const getTeamPlayers = (req, res) => {
    try {
        const { id } = req.params;
        const { year, name } = req.query;

        let sql = `
            WITH RankedPlayers AS (
                SELECT 
                    p.player_id,
                    p.first_name,
                    p.last_name,
                    p.photo_url,
                    p.position,
                    p.nationality_id,
                    nat.country_name as nationality,
                    ps.season,
                    ps.matches_played,
                    ps.goals,
                    ps.assists,
                    ROW_NUMBER() OVER (
                        PARTITION BY p.player_id 
                        ORDER BY ps.season DESC
                    ) as rn
                FROM V2_players p
                INNER JOIN V2_player_statistics ps ON p.player_id = ps.player_id
                LEFT JOIN V2_countries nat ON p.nationality_id = nat.country_id
                WHERE ps.club_id = ?
        `;

        const params = [id];

        if (year) {
            sql += ` AND ps.season = ?`;
            params.push(year);
        }

        if (name && name.trim()) {
            sql += ` AND (p.first_name LIKE ? OR p.last_name LIKE ?)`;
            const searchTerm = `%${name.trim()}%`;
            params.push(searchTerm, searchTerm);
        }

        sql += `
            )
            SELECT * FROM RankedPlayers
            WHERE rn = 1
            ORDER BY season DESC, last_name ASC
        `;

        const players = db.all(sql, params);

        // Get available seasons for this team
        const seasons = db.all(`
            SELECT DISTINCT season
            FROM V2_player_statistics
            WHERE club_id = ?
            ORDER BY season DESC
        `, [id]);

        res.json({
            players,
            seasons: seasons.map(s => s.season)
        });
    } catch (error) {
        console.error('Error fetching team players:', error);
        res.status(500).json({ error: 'Failed to fetch team players' });
    }
};

/**
 * Search teams by name and/or country
 */
export const searchTeams = (req, res) => {
    try {
        const { name, country } = req.query;

        if (!name && !country) {
            return res.json({ teams: [] });
        }

        let sql = `
            SELECT 
                c.club_id,
                c.club_name,
                c.club_logo_url,
                c.country_id,
                co.country_name,
                COUNT(DISTINCT ps.player_id) as player_count
            FROM V2_clubs c
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            LEFT JOIN V2_player_statistics ps ON c.club_id = ps.club_id
            WHERE 1=1
        `;

        const params = [];

        if (name && name.trim()) {
            sql += ` AND c.club_name LIKE ?`;
            params.push(`%${name.trim()}%`);
        }

        if (country && country.trim()) {
            sql += ` AND co.country_name LIKE ?`;
            params.push(`%${country.trim()}%`);
        }

        sql += `
            GROUP BY c.club_id
            HAVING player_count > 0
            ORDER BY player_count DESC, c.club_name ASC
            LIMIT 50
        `;

        const teams = db.all(sql, params);
        res.json({ teams });
    } catch (error) {
        console.error('Error searching teams:', error);
        res.status(500).json({ error: 'Failed to search teams' });
    }
};

/**
 * Get available countries for autocomplete
 */
export const getCountriesForTeams = (req, res) => {
    try {
        const countries = db.all(`
            SELECT DISTINCT 
                co.country_id,
                co.country_name,
                co.flag_url
            FROM V2_countries co
            INNER JOIN V2_clubs c ON co.country_id = c.country_id
            ORDER BY co.country_name ASC
        `);

        res.json(countries);
    } catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({ error: 'Failed to fetch countries' });
    }
};
