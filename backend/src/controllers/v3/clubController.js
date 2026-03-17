import ClubRepository from '../../repositories/v3/ClubRepository.js';
import logger from '../../utils/logger.js';

/**
 * US_V3-CLUB-001: Comprehensive Club Profile
 */
export const getClubProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { year, leagueId } = req.query;

        const club = await ClubRepository.getClubProfileWithVenue(id);
        if (!club) {
            return res.status(404).json({ success: false, error: 'Club not found' });
        }

        const seasons = await ClubRepository.getClubSeasons(id);
        const availableYears = [...new Set(seasons.map(s => s.season_year))].sort((a, b) => b - a);

        const rosterYear = year ? Number.parseInt(year) : (availableYears[0] || null);
        const activeLeagueId = leagueId ? Number.parseInt(leagueId) : null;

        const roster = rosterYear ? await ClubRepository.getClubRoster(id, rosterYear, activeLeagueId) : [];
        const summary = rosterYear ? await ClubRepository.getClubSummary(id, rosterYear, activeLeagueId) : null;
        const coachRow = await ClubRepository.getLatestCoach(id);

        res.json({
            success: true,
            data: {
                club: { ...club, coach: coachRow?.coach_name || null },
                seasons,
                availableYears,
                rosterYear,
                roster,
                summary
            }
        });

    } catch (error) {
        logger.error({ err: error, clubId: req.params.id }, 'V3 Club Profile Error');
        res.status(500).json({ success: false, error: 'Failed to fetch club profile' });
    }
};


export const getClubTacticalSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { year, competition } = req.query;
        const summary = await ClubRepository.getClubTacticalSummary(id, {
            year: year ? Number.parseInt(year) : null,
            competition: competition
        });
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getClubMatches = async (req, res) => {
    try {
        const { id } = req.params;
        const { year, competition, limit } = req.query;
        const matches = await ClubRepository.getClubMatches(id, {
            year: year ? Number.parseInt(year) : null,
            competition: competition,
            limit: limit ? Number.parseInt(limit) : 20
        });
        res.json({ success: true, data: matches });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
