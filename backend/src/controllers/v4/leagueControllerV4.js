import { z } from 'zod';

import StandingsV4Service from '../../services/v4/StandingsV4Service.js';
import MatchDetailV4Service from '../../services/v4/MatchDetailV4Service.js';
import LeagueServiceV4 from '../../services/v4/LeagueServiceV4.js';
import logger from '../../utils/logger.js';

const leagueSeasonParamsSchema = z.object({
    league: z.string().min(1),
    season: z.string().min(1)
});

const fixtureIdSchema = z.object({
    fixtureId: z.string().min(1)
});

const fixtureRouteIdSchema = z.object({
    id: z.string().min(1)
});

const teamSquadParamsSchema = z.object({
    league: z.string().min(1),
    season: z.string().min(1),
    teamId: z.string().min(1)
});

const seasonPlayersQuerySchema = z.object({
    teamId: z.string().optional(),
    position: z.enum(['ALL', 'Goalkeeper', 'Defender', 'Midfielder', 'Attacker']).optional().default('ALL'),
    sortBy: z.enum(['goals', 'appearances', 'assists', 'minutes', 'name']).optional().default('goals'),
    order: z.enum(['ASC', 'DESC']).optional().default('DESC')
});

function handleValidationError(res, error) {
    return res.status(400).json({
        success: false,
        error: error?.issues?.[0]?.message || 'Invalid request'
    });
}

export const getLeaguesV4 = async (_req, res) => {
    try {
        const data = await LeagueServiceV4.getLeaguesGroupedByCountry();
        res.json({ success: true, data });
    } catch (error) {
        logger.error({ err: error }, 'V4 getLeagues error');
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export const getSeasonOverviewV4 = async (req, res) => {
    try {
        const params = leagueSeasonParamsSchema.parse(req.params);
        const leagueData = await LeagueServiceV4.getCompetitionByName(params.league);

        if (!leagueData) {
            return res.status(404).json({ success: false, error: 'League not found in V4' });
        }

        const [standings, topScorers, topAssists, availableYears] = await Promise.all([
            StandingsV4Service.calculateStandings(leagueData.competition_id, params.season),
            LeagueServiceV4.getTopScorers(leagueData.competition_id, params.season),
            LeagueServiceV4.getTopAssists(leagueData.competition_id, params.season),
            LeagueServiceV4.getAvailableSeasonsByCompetitionId(leagueData.competition_id)
        ]);

        res.json({
            success: true,
            data: {
                league: {
                    league_id: leagueData.competition_id,
                    league_name: leagueData.name,
                    type: leagueData.competition_type,
                    logo_url: leagueData.logo_url,
                    country_name: leagueData.country_name,
                    country_flag: leagueData.country_flag
                },
                standings,
                topScorers,
                topAssists,
                topRated: [],
                availableYears
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(res, error);
        }

        logger.error({ err: error, league: req.params.league, season: req.params.season }, 'V4 season overview error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getSeasonPlayersV4 = async (req, res) => {
    try {
        const params = leagueSeasonParamsSchema.parse(req.params);
        const query = seasonPlayersQuerySchema.parse(req.query);
        const leagueData = await LeagueServiceV4.getCompetitionByName(params.league);

        if (!leagueData) {
            return res.status(404).json({ success: false, error: 'League not found in V4' });
        }

        const players = await LeagueServiceV4.getSeasonPlayers(leagueData.competition_id, params.season, query);
        res.json({ success: true, data: players });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(res, error);
        }

        logger.error({ err: error, league: req.params.league, season: req.params.season }, 'V4 getSeasonPlayers error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getFixturesV4 = async (req, res) => {
    try {
        const params = leagueSeasonParamsSchema.parse(req.params);
        const leagueData = await LeagueServiceV4.getCompetitionByName(params.league);

        if (!leagueData) {
            return res.status(404).json({ success: false, error: 'League not found in V4' });
        }

        const fixtures = await LeagueServiceV4.getFixtures(leagueData.competition_id, params.season);
        const rounds = [...new Set(fixtures.map((fixture) => fixture.round))]
            .filter(Boolean)
            .sort((a, b) => {
                const numA = Number.parseInt(String(a).match(/\d+/)?.[0] || '0', 10);
                const numB = Number.parseInt(String(b).match(/\d+/)?.[0] || '0', 10);
                return numA - numB;
            });

        res.json({
            success: true,
            data: {
                fixtures,
                rounds
            }
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(res, error);
        }

        logger.error({ err: error, league: req.params.league, season: req.params.season }, 'V4 getFixtures error');
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export const getFixtureDetailsV4 = async (req, res) => {
    try {
        const { fixtureId } = fixtureIdSchema.parse(req.params);
        const match = await MatchDetailV4Service.getFixtureDetails(fixtureId);
        if (!match) {
            return res.status(404).json({ success: false, error: 'Match not found in V4' });
        }

        res.json({ success: true, data: match });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(res, error);
        }

        logger.error({ err: error, fixtureId: req.params.fixtureId }, 'V4 getFixtureDetails error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getFixtureEventsV4 = async (req, res) => {
    try {
        const { id } = fixtureRouteIdSchema.parse(req.params);
        const events = await MatchDetailV4Service.getFixtureEvents(id);
        res.json({ success: true, data: events });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(res, error);
        }

        logger.error({ err: error, fixtureId: req.params.id }, 'V4 getFixtureEvents error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getFixtureLineupsV4 = async (req, res) => {
    try {
        const { id } = fixtureRouteIdSchema.parse(req.params);
        const lineups = await MatchDetailV4Service.getFixtureLineups(id);
        res.json({ success: true, data: lineups });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(res, error);
        }

        logger.error({ err: error, fixtureId: req.params.id }, 'V4 getFixtureLineups error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getFixtureTacticalStatsV4 = async (req, res) => {
    try {
        fixtureRouteIdSchema.parse(req.params);
        const stats = await MatchDetailV4Service.getFixtureTacticalStats(req.params.id);
        res.json({ success: true, data: stats });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(res, error);
        }

        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getFixturePlayerTacticalStatsV4 = async (req, res) => {
    try {
        fixtureRouteIdSchema.parse(req.params);
        const stats = await MatchDetailV4Service.getFixturePlayerTacticalStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(res, error);
        }

        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

export const getPlayerSeasonStatsV4 = async (req, res) => {
    try {
        const params = leagueSeasonParamsSchema.parse(req.params);
        const { playerId } = req.params;
        const leagueData = await LeagueServiceV4.getCompetitionByName(params.league);
        if (!leagueData) return res.status(404).json({ success: false, error: 'League not found' });
        const stats = await LeagueServiceV4.getPlayerSeasonStats(leagueData.competition_id, params.season, playerId);
        if (!stats) return res.status(404).json({ success: false, error: 'Player not found' });
        res.json({ success: true, data: stats });
    } catch (error) {
        if (error instanceof z.ZodError) return handleValidationError(res, error);
        logger.error({ err: error }, 'V4 getPlayerSeasonStats error');
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export const getTeamSquadV4 = async (req, res) => {
    try {
        const params = teamSquadParamsSchema.parse(req.params);
        const leagueData = await LeagueServiceV4.getCompetitionByName(params.league);

        if (!leagueData) {
            return res.status(404).json({ success: false, error: 'League not found in V4' });
        }

        const squad = await LeagueServiceV4.getTeamSquad(leagueData.competition_id, params.season, params.teamId);
        res.json({ success: true, data: squad });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(res, error);
        }

        logger.error({ err: error, teamId: req.params.teamId, league: req.params.league, season: req.params.season }, 'V4 getTeamSquad error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};
