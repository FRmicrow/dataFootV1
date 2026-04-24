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

export const getCoverageV4 = async (_req, res) => {
    try {
        const data = await LeagueServiceV4.getCoverageByCompetition();
        res.json({ success: true, data });
    } catch (error) {
        logger.error({ err: error }, 'V4 getCoverage error');
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

        // Resolve display season (e.g. 2021) to DB label (e.g. 2020 for Euro)
        const dbSeason = await LeagueServiceV4.resolveSeason(params.season, leagueData.all_ids || [leagueData.competition_id], leagueData.name, leagueData.competition_type);

        const [standings, topScorers, topAssists, availableYears] = await Promise.all([
            StandingsV4Service.calculateStandings(leagueData.all_ids || [leagueData.competition_id], dbSeason),
            LeagueServiceV4.getTopScorers(leagueData.competition_id, dbSeason),
            LeagueServiceV4.getTopAssists(leagueData.competition_id, dbSeason),
            LeagueServiceV4.getAvailableSeasonsByCompetitionId(leagueData.competition_id, leagueData.name, leagueData.competition_type)
        ]);

        let display_mode = 'league';
        const type = leagueData.competition_type;
        if (type === 'cup' || type === 'international') {
            display_mode = 'cup';
        } else if (type === 'super_cup') {
            display_mode = 'super_cup';
        }
        
        const isHybridComp = ['UEFA Champions League', 'Europa League', 'Europa Conference League', 'UEFA Conference League'].includes(leagueData.name);
        const startYear = parseInt(params.season.split('-')[0], 10);
        if (isHybridComp && startYear >= 2024) {
            display_mode = 'hybrid';
        }

        res.json({
            success: true,
            data: {
                league: {
                    league_id: leagueData.competition_id,
                    league_name: leagueData.name,
                    type: leagueData.competition_type,
                    logo_url: leagueData.logo_url,
                    country_name: leagueData.country_name,
                    country_flag: leagueData.country_flag,
                    display_mode: display_mode,
                    season_display: LeagueServiceV4.formatSeasonLabel(params.season, leagueData.name, leagueData.competition_type)
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

        const dbSeason = await LeagueServiceV4.resolveSeason(params.season, leagueData.all_ids || [leagueData.competition_id], leagueData.name, leagueData.competition_type);
        const players = await LeagueServiceV4.getSeasonPlayers(leagueData.competition_id, dbSeason, query);
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

        const dbSeason = await LeagueServiceV4.resolveSeason(params.season, leagueData.all_ids || [leagueData.competition_id], leagueData.name, leagueData.competition_type);
        const fixtures = await LeagueServiceV4.getFixtures(leagueData.all_ids || [leagueData.competition_id], dbSeason);
        const rounds = [...new Set(fixtures.map((fixture) => fixture.round))]
            .filter(Boolean)
            .sort((a, b) => {
                const sortOrder = [
                    /^Groupe\s+/i,
                    /1\/8/,
                    /1\/4/,
                    /Demi/,
                    /3ème/,
                    /Finale/
                ];
                const getOrderIdx = (r) => {
                    for (let i = 0; i < sortOrder.length; i++) {
                        if (sortOrder[i].test(r)) return i;
                    }
                    return 999;
                };
                const idxA = getOrderIdx(a);
                const idxB = getOrderIdx(b);
                if (idxA !== idxB) return idxA - idxB;
                if (idxA === 0) return a.localeCompare(b); // Sort groups alphabetically
                const numA = Number.parseInt(String(a).match(/\d+/)?.[0] || '0', 10);
                const numB = Number.parseInt(String(b).match(/\d+/)?.[0] || '0', 10);
                return numA - numB;
            });
        const phaseOrder = [
            leagueData.name,
            'Qualif. Europe',
            'Qualif. Am. Sud',
            'Qualif. Am. Nord',
            'Qualif. Afrique',
            'Qualif. Asie',
            'Qualif. Océanie'
        ];
        const phases = [...new Set(fixtures.map((f) => f.competition_name))]
            .filter(Boolean)
            .sort((a, b) => {
                let idxA = phaseOrder.indexOf(a);
                let idxB = phaseOrder.indexOf(b);
                if (idxA === -1) idxA = 999;
                if (idxB === -1) idxB = 999;
                if (idxA === idxB) return a.localeCompare(b);
                return idxA - idxB;
            });

        res.json({
            success: true,
            data: {
                fixtures,
                rounds,
                phases
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

        logger.error({ err: error }, 'V4 getFixtureTacticalStats error');
        res.status(500).json({ success: false, error: 'Internal Server Error' });
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

        logger.error({ err: error }, 'V4 getFixturePlayerTacticalStats error');
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export const getPlayerSeasonStatsV4 = async (req, res) => {
    try {
        const params = leagueSeasonParamsSchema.parse(req.params);
        const { playerId } = req.params;
        const leagueData = await LeagueServiceV4.getCompetitionByName(params.league);
        if (!leagueData) return res.status(404).json({ success: false, error: 'League not found' });
        const dbSeason = await LeagueServiceV4.resolveSeason(params.season, leagueData.all_ids || [leagueData.competition_id], leagueData.name, leagueData.competition_type);
        const stats = await LeagueServiceV4.getPlayerSeasonStats(leagueData.competition_id, dbSeason, playerId);
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
        if (!leagueData) return res.status(404).json({ success: false, error: 'League not found' });

        const dbSeason = await LeagueServiceV4.resolveSeason(params.season, leagueData.all_ids || [leagueData.competition_id], leagueData.name, leagueData.competition_type);
        const squad = await LeagueServiceV4.getTeamSquad(leagueData.competition_id, dbSeason, params.teamId);
        res.json({ success: true, data: squad });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return handleValidationError(res, error);
        }

        logger.error({ err: error, teamId: req.params.teamId, league: req.params.league, season: req.params.season }, 'V4 getTeamSquad error');
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};
