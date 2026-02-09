import db from '../config/database.js';

/**
 * Get detailed stats for a competition season
 * Includes aggregated club stats and individual season leaders
 */
export const getCompetitionSeasonDetails = (req, res) => {
    try {
        const { id, year } = req.params;

        // 1. Get Competition Metadata
        const competition = db.get(`
            SELECT comp.competition_id, comp.competition_name, comp.competition_short_name, co.country_name, co.flag_url
            FROM V2_competitions comp
            LEFT JOIN V2_countries co ON comp.country_id = co.country_id
            WHERE comp.competition_id = ?
        `, [id]);

        if (!competition) {
            return res.status(404).json({ error: 'Competition not found' });
        }

        // 2. Get Statistical Standings (Aggregated Club Stats)
        const standings = db.all(`
            SELECT 
                c.club_id,
                c.club_name,
                c.club_logo_url,
                MAX(ps.matches_played) as max_matches,
                SUM(ps.matches_played) as total_matches,
                SUM(ps.goals) as total_goals,
                SUM(ps.assists) as total_assists,
                SUM(ps.clean_sheets) as total_clean_sheets,
                SUM(ps.minutes_played) as total_minutes
            FROM V2_clubs c
            INNER JOIN V2_player_statistics ps ON c.club_id = ps.club_id
            WHERE ps.competition_id = ? AND (ps.season = ? OR ps.year = ?)
            GROUP BY c.club_id
            ORDER BY total_goals DESC, total_assists DESC
        `, [id, year, parseInt(year)]);

        // 3. Get Top Performers (Top 5 for Goals and Assists)
        const topGoalsList = db.all(`
            SELECT p.player_id, p.first_name, p.last_name, p.photo_url, ps.goals, c.club_name, c.club_logo_url
            FROM V2_players p
            INNER JOIN V2_player_statistics ps ON p.player_id = ps.player_id
            LEFT JOIN V2_clubs c ON ps.club_id = c.club_id
            WHERE ps.competition_id = ? AND (ps.season = ? OR ps.year = ?)
            ORDER BY ps.goals DESC
            LIMIT 5
        `, [id, year, parseInt(year)]);

        const topAssistsList = db.all(`
            SELECT p.player_id, p.first_name, p.last_name, p.photo_url, ps.assists, c.club_name, c.club_logo_url
            FROM V2_players p
            INNER JOIN V2_player_statistics ps ON p.player_id = ps.player_id
            LEFT JOIN V2_clubs c ON ps.club_id = c.club_id
            WHERE ps.competition_id = ? AND (ps.season = ? OR ps.year = ?)
            ORDER BY ps.assists DESC
            LIMIT 5
        `, [id, year, parseInt(year)]);

        // 4. Get Season Leaders (Legacy support for 3 cards)
        const topGoalkeeper = db.get(`
            SELECT p.player_id, p.first_name, p.last_name, p.photo_url, ps.clean_sheets, c.club_name, c.club_logo_url
            FROM V2_players p
            INNER JOIN V2_player_statistics ps ON p.player_id = ps.player_id
            LEFT JOIN V2_clubs c ON ps.club_id = c.club_id
            WHERE ps.competition_id = ? AND (ps.season = ? OR ps.year = ?) AND (p.position = 'Goalkeeper' OR ps.clean_sheets > 0)
            ORDER BY ps.clean_sheets DESC
            LIMIT 1
        `, [id, year, parseInt(year)]);

        // 5. Get available seasons for the dropdown
        const seasons = db.all(`
            SELECT DISTINCT season
            FROM V2_player_statistics
            WHERE competition_id = ?
            ORDER BY season DESC
        `, [id]);

        res.json({
            competition,
            info: competition, // Compatibility with older frontend
            standings,
            topPerformers: {
                goals: topGoalsList,
                assists: topAssistsList
            },
            leaders: {
                topScorer: topGoalsList[0] || null,
                topPlaymaker: topAssistsList[0] || null,
                topGoalkeeper: topGoalkeeper || null
            },
            seasons: seasons.map(s => s.season)
        });

    } catch (error) {
        console.error('Error fetching competition season details:', error);
        res.status(500).json({ error: 'Failed to fetch competition data' });
    }
};

/**
 * Get available seasons for a competition
 */
export const getCompetitionSeasons = (req, res) => {
    try {
        const { id } = req.params;

        const comp = db.get("SELECT competition_id FROM V2_competitions WHERE competition_id = ?", [id]);
        if (!comp) {
            return res.status(404).json({ error: 'Competition not found' });
        }

        const seasons = db.all(`
            SELECT DISTINCT season
            FROM V2_player_statistics
            WHERE competition_id = ?
            ORDER BY year DESC, season DESC
        `, [id]);

        res.json({
            competition_id: id,
            seasons: seasons.map(s => s.season)
        });
    } catch (error) {
        console.error('Error fetching competition seasons:', error);
        res.status(500).json({ error: 'Failed to fetch competition seasons' });
    }
};

/**
 * Get competition basic info and available seasons
 */
export const getCompetitionBasicInfo = (req, res) => {
    try {
        const { id } = req.params;

        const info = db.get(`
            SELECT comp.*, co.country_name, co.flag_url
            FROM V2_competitions comp
            LEFT JOIN V2_countries co ON comp.country_id = co.country_id
            WHERE comp.competition_id = ?
        `, [id]);

        if (!info) {
            return res.status(404).json({ error: 'Competition not found' });
        }

        const seasons = db.all(`
            SELECT DISTINCT season
            FROM V2_player_statistics
            WHERE competition_id = ?
            ORDER BY season DESC
        `, [id]);

        res.json({
            info,
            seasons: seasons.map(s => s.season)
        });
    } catch (error) {
        console.error('Error fetching competition basic info:', error);
        res.status(500).json({ error: 'Failed to fetch competition data' });
    }
};
