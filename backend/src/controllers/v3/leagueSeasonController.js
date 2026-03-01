import LeagueRepository from '../../repositories/v3/LeagueRepository.js';
import LeagueSeasonRepository from '../../repositories/v3/LeagueSeasonRepository.js';

/**
 * Get the status of all seasons for a specific league
 */
export const getLeagueSeasonsStatus = async (req, res) => {
    try {
        const { id: leagueId } = req.params;

        // Verify League Exists
        const league = LeagueRepository.findOne({ league_id: leagueId });
        if (!league) {
            return res.status(404).json({ error: 'V3 League not found' });
        }

        // Get Seasons Status
        const seasons = LeagueSeasonRepository.getSeasonsStatusByLeague(leagueId);

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
export const getSyncStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const seasons = LeagueSeasonRepository.findMany({ league_id: id });

        // Convert 1/0 to true/false
        const formatted = seasons.map(s => ({
            year: s.season_year,
            players: !!s.imported_players,
            fixtures: !!s.imported_fixtures,
            standings: !!s.imported_standings
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
export const initializeSeasons = async (req, res) => {
    try {
        const { leagueId, startYear, endYear } = req.body;

        if (!leagueId || !startYear || !endYear) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const added = [];
        for (let year = startYear; year <= endYear; year++) {
            // Check if exists
            const existing = LeagueSeasonRepository.findOne({ league_id: leagueId, season_year: year });

            if (!existing) {
                LeagueSeasonRepository.insert({
                    league_id: leagueId,
                    season_year: year,
                    is_current: year === new Date().getFullYear() ? 1 : 0
                });
                added.push(year);
            }
        }

        res.json({ message: 'Seasons initialized', added });

    } catch (error) {
        console.error('V3 Init Error:', error);
        res.status(500).json({ error: 'Failed to initialize seasons' });
    }
};
