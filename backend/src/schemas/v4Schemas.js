import { z } from 'zod';

/**
 * V4 Zod validation schemas.
 * Used with validateRequest middleware: schema wraps { params, query, body }.
 */

// ─── Common param schemas ──────────────────────────────────────────────────

const leagueSeasonParams = z.object({
    league: z.string().min(1, 'league is required'),
    season: z.string().min(1, 'season is required'),
});

const fixtureIdParams = z.object({
    fixtureId: z.string().min(1, 'fixtureId is required'),
});

const routeIdParams = z.object({
    id: z.string().min(1, 'id is required'),
});

const matchIdParams = z.object({
    matchId: z.string().min(1, 'matchId is required'),
});

const teamSquadParams = z.object({
    league: z.string().min(1),
    season: z.string().min(1),
    teamId: z.string().min(1),
});

const competitionSeasonParams = z.object({
    competitionId: z.string().min(1, 'competitionId is required'),
    season: z.string().min(4, 'season is required'),
});

// ─── Query schemas ─────────────────────────────────────────────────────────

const seasonPlayersQuery = z.object({
    teamId:   z.string().optional(),
    position: z.enum(['ALL', 'Goalkeeper', 'Defender', 'Midfielder', 'Attacker']).optional(),
    sortBy:   z.enum(['goals', 'appearances', 'assists', 'minutes', 'name', 'xg', 'xa', 'npxg', 'xg_90', 'xa_90', 'npxg_90', 'xg_chain', 'xg_chain_90', 'xg_buildup', 'xg_buildup_90']).optional(),
    order:    z.enum(['ASC', 'DESC']).optional(),
});

// ─── Exported request validators ──────────────────────────────────────────

/** GET /v4/leagues */
export const getLeaguesSchema = z.object({
    params: z.object({}).passthrough(),
    query:  z.object({}).passthrough(),
    body:   z.object({}).passthrough(),
});

/** GET /v4/league/:league/season/:season */
export const getSeasonOverviewSchema = z.object({
    params: leagueSeasonParams,
    query:  z.object({}).passthrough(),
    body:   z.object({}).passthrough(),
});

/** GET /v4/league/:league/season/:season/players */
export const getSeasonPlayersSchema = z.object({
    params: leagueSeasonParams,
    query:  seasonPlayersQuery,
    body:   z.object({}).passthrough(),
});

/** GET /v4/league/:league/season/:season/team/:teamId/squad */
export const getTeamSquadSchema = z.object({
    params: teamSquadParams,
    query:  z.object({}).passthrough(),
    body:   z.object({}).passthrough(),
});

/** GET /v4/league/:league/season/:season/fixtures */
export const getFixturesSchema = z.object({
    params: leagueSeasonParams,
    query:  z.object({}).passthrough(),
    body:   z.object({}).passthrough(),
});

/** GET /v4/match/:fixtureId */
export const getFixtureDetailsSchema = z.object({
    params: fixtureIdParams,
    query:  z.object({}).passthrough(),
    body:   z.object({}).passthrough(),
});

/** GET /v4/fixtures/:id/events|lineups|tactical-stats|player-tactical-stats */
export const getFixtureByIdSchema = z.object({
    params: routeIdParams,
    query:  z.object({}).passthrough(),
    body:   z.object({}).passthrough(),
});

/** GET /v4/matches/:matchId/odds */
export const getMatchOddsSchema = z.object({
    params: matchIdParams,
    query:  z.object({}).passthrough(),
    body:   z.object({}).passthrough(),
});

/** GET /v4/competitions/:competitionId/season/:season/xg */
export const getCompetitionSeasonXgSchema = z.object({
    params: competitionSeasonParams,
    query:  z.object({}).passthrough(),
    body:   z.object({}).passthrough(),
});

/** GET /v4/league/:league/season/:season/team-xg */
export const getLeagueSeasonTeamXgSchema = z.object({
    params: leagueSeasonParams,
    query:  z.object({}).passthrough(),
    body:   z.object({}).passthrough(),
});
