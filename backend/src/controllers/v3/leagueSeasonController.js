import db from '../../config/database.js';

/**
 * Get the status of all seasons for a specific league
 */
export const getLeagueSeasonsStatus = (req, res) => {
    try {
        const { id: leagueId } = req.params;

        // Verify League Exists
        const league = db.get('SELECT * FROM V3_Leagues WHERE league_id = ?', [leagueId]);
        if (!league) {
            return res.status(404).json({ error: 'V3 League not found' });
        }

        // Get Seasons Status
        const seasons = db.all(`
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
 * Get simple sync status for a league (used by import form)
 */
export const getSyncStatus = (req, res) => {
    try {
        const { id } = req.params;
        const seasons = db.all(`
            SELECT 
                season_year as year,
                imported_players as players,
                imported_fixtures as fixtures,
                imported_standings as standings
            FROM V3_League_Seasons
            WHERE league_id = ?
        `, [id]);

        // Convert 1/0 to true/false
        const formatted = seasons.map(s => ({
            year: s.year,
            players: !!s.players,
            fixtures: !!s.fixtures,
            standings: !!s.standings
        }));

        res.json(formatted);
    } catch (error) {
        console.error('V3 Sync Status Error:', error);
        res.status(500).json({ error: error.message });
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
            const existing = db.get('SELECT * FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?', [leagueId, year]);

            if (!existing) {
                db.run(`
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
