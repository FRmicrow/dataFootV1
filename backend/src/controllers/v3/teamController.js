import TeamRepository from '../../repositories/v3/TeamRepository.js';
import logger from '../../utils/logger.js';

/**
 * US_V3-CLUB-001: Comprehensive Team Profile
 */
export const getTeamProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { year, leagueId } = req.query;

        const team = await TeamRepository.getTeamProfileWithVenue(id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }

        const seasons = await TeamRepository.getTeamSeasons(id);
        const availableYears = [...new Set(seasons.map(s => s.season_year))].sort((a, b) => b - a);

        const rosterYear = year ? Number.parseInt(year) : (availableYears[0] || null);
        const activeLeagueId = leagueId ? Number.parseInt(leagueId) : null;

        const roster = rosterYear ? await TeamRepository.getTeamRoster(id, rosterYear, activeLeagueId) : [];
        const summary = rosterYear ? await TeamRepository.getTeamSummary(id, rosterYear, activeLeagueId) : null;
        const coachRow = await TeamRepository.getLatestCoach(id);

        res.json({
            success: true,
            data: {
                team: { ...team, coach: coachRow?.coach_name || null },
                seasons,
                availableYears,
                rosterYear,
                roster,
                summary
            }
        });

    } catch (error) {
        logger.error({ err: error, teamId: req.params.id }, 'V3 Team Profile Error');
        res.status(500).json({ success: false, error: 'Failed to fetch team profile' });
    }
};


export const getTeamTacticalSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { year, competition } = req.query;
        const summary = await TeamRepository.getTeamTacticalSummary(id, {
            year: year ? Number.parseInt(year) : null,
            competition: competition
        });
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getTeamMatches = async (req, res) => {
    try {
        const { id } = req.params;
        const { year, competition, limit } = req.query;
        const matches = await TeamRepository.getTeamMatches(id, {
            year: year ? Number.parseInt(year) : null,
            competition: competition,
            limit: limit ? Number.parseInt(limit) : 20
        });
        res.json({ success: true, data: matches });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
