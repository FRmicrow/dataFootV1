import dbV3 from '../../config/database_v3.js';

/**
 * Get the status of all seasons for a specific league
 */
export const getLeagueSeasonsStatus = (req, res) => {
    try {
        const { id: leagueId } = req.params;

        // Verify League Exists
        const league = dbV3.get('SELECT * FROM V3_Leagues WHERE league_id = ?', [leagueId]);
        if (!league) {
            return res.status(404).json({ error: 'V3 League not found' });
        }

        // Get Seasons Status
        const seasons = dbV3.all(`
            SELECT 
                ls.league_season_id,
                ls.season_year,
                ls.is_current,
                ls.coverage_fixtures,
                ls.imported_fixtures,
                ls.imported_players,
                ls.imported_standings,
                ls.last_updated
            FROM V3_League_Seasons ls
            WHERE ls.league_id = ?
            ORDER BY ls.season_year DESC
        `, [leagueId]);

        res.json({
            league: {
                id: league.league_id,
                name: league.name,
                country_id: league.country_id
            },
            seasons
        });

    } catch (error) {
        console.error('V3 Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Initialize new seasons for a league (e.g. 2010-2025)
 */
export const initializeSeasons = (req, res) => {
    try {
        const { leagueId, startYear, endYear } = req.body;

        if (!leagueId || !startYear || !endYear) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const added = [];
        for (let year = startYear; year <= endYear; year++) {
            // Check if exists
            const existing = dbV3.get('SELECT * FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?', [leagueId, year]);

            if (!existing) {
                dbV3.run(`
                    INSERT INTO V3_League_Seasons (league_id, season_year, is_current)
                    VALUES (?, ?, ?)
                `, [leagueId, year, year === new Date().getFullYear() ? 1 : 0]);
                added.push(year);
            }
        }

        res.json({ message: 'Seasons initialized', added });

    } catch (error) {
        console.error('V3 Init Error:', error);
        res.status(500).json({ error: 'Failed to initialize seasons' });
    }
};
