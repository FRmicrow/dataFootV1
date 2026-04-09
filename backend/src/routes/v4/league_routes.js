import express from 'express';
import {
    getLeaguesV4, getSeasonOverviewV4, getFixturesV4, getSeasonPlayersV4, getTeamSquadV4,
    getFixtureDetailsV4, getFixtureEventsV4, getFixtureLineupsV4, getFixtureTacticalStatsV4,
    getFixturePlayerTacticalStatsV4, getPlayerSeasonStatsV4
} from '../../controllers/v4/leagueControllerV4.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    getLeaguesSchema,
    getSeasonOverviewSchema,
    getSeasonPlayersSchema,
    getTeamSquadSchema,
    getFixturesSchema,
    getFixtureDetailsSchema,
    getFixtureByIdSchema,
} from '../../schemas/v4Schemas.js';

const router = express.Router();

// Base leagues list
router.get('/leagues', validateRequest(getLeaguesSchema), getLeaguesV4);

// Season overview (Standings + Top stats)
router.get('/league/:league/season/:season', validateRequest(getSeasonOverviewSchema), getSeasonOverviewV4);

// Player stats (Squad Explorer)
router.get('/league/:league/season/:season/players', validateRequest(getSeasonPlayersSchema), getSeasonPlayersV4);
router.get('/league/:league/season/:season/team/:teamId/squad', validateRequest(getTeamSquadSchema), getTeamSquadV4);

// Fixtures
router.get('/league/:league/season/:season/fixtures', validateRequest(getFixturesSchema), getFixturesV4);

// Player season stats (for inline card)
router.get('/league/:league/season/:season/player/:playerId', validateRequest(getSeasonOverviewSchema), getPlayerSeasonStatsV4);

// Match Detail
router.get('/match/:fixtureId', validateRequest(getFixtureDetailsSchema), getFixtureDetailsV4);
router.get('/fixtures/:id/events', validateRequest(getFixtureByIdSchema), getFixtureEventsV4);
router.get('/fixtures/:id/lineups', validateRequest(getFixtureByIdSchema), getFixtureLineupsV4);
router.get('/fixtures/:id/tactical-stats', validateRequest(getFixtureByIdSchema), getFixtureTacticalStatsV4);
router.get('/fixtures/:id/player-tactical-stats', validateRequest(getFixtureByIdSchema), getFixturePlayerTacticalStatsV4);

export default router;
