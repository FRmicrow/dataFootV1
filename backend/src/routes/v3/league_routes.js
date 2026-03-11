import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import { leagueIdParamSchema, initSeasonsSchema } from '../../schemas/v3Schemas.js';
import { getLeagueSeasonsStatus, initializeSeasons, getSyncStatus } from '../../controllers/v3/leagueSeasonController.js';
import { getCountriesV3, getLeaguesV3, getStandingsV3, getFixturesV3, getAvailableSeasons } from '../../controllers/v3/importControllerV3.js';
import { getStructuredLeagues } from '../../controllers/v3/leagueStructuredController.js';
import { getSeasonOverview, getSeasonPlayers, getTeamSquad, getDynamicStandings } from '../../controllers/v3/seasonController.js';

const router = express.Router();

// Countries & Leagues
router.get('/countries', getCountriesV3);
router.get('/leagues', getLeaguesV3);
router.get('/leagues/structured', getStructuredLeagues);

// Season Tracking
router.get('/leagues/:id/seasons', validateRequest(leagueIdParamSchema), getLeagueSeasonsStatus);
router.get('/league/:id/sync-status', validateRequest(leagueIdParamSchema), getSyncStatus);
router.post('/leagues/seasons/init', validateRequest(initSeasonsSchema), initializeSeasons);
router.get('/league/:id/season/:year', getSeasonOverview);
router.get('/league/:id/season/:year/players', getSeasonPlayers);
router.post('/league/:id/season/:year/sync', importLeagueV3);
router.get('/league/:leagueId/season/:year/club/:teamId/squad', getTeamSquad);
router.get('/league/:apiId/available-seasons', getAvailableSeasons);

// Standings & Fixtures
router.get('/standings/dynamic', getDynamicStandings);
router.get('/league/:id/standings', getStandingsV3);
router.get('/league/:id/fixtures', getFixturesV3);

export default router;
