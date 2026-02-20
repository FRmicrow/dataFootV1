import express from 'express';
import { getLeagueSeasonsStatus, initializeSeasons, getSyncStatus } from '../controllers/v3/leagueSeasonController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
    importLeagueSchema,
    importBatchSchema,
    searchSchema,
    initSeasonsSchema,
    syncEventsSchema,
    importLineupsSchema,
    predictionsSyncSchema,
    studioQuerySchema,
    studioRankingsSchema,
    syncCareerSchema,
    healthFixSchema,
    healthFixAllSchema,
    healthRevertSchema,
    healthCheckLeagueSchema,
    healthCheckDeepSchema,
    importTrophiesSchema,
    preferencesSchema
} from '../schemas/v3Schemas.js';

const router = express.Router();

/**
 * @route GET /api/leagues/:id/seasons
 * @desc Get the Granular Tracker status for a league
 */
router.get('/leagues/:id/seasons', getLeagueSeasonsStatus);
router.get('/league/:id/sync-status', getSyncStatus);

/**
 * @route POST /api/leagues/seasons/init
 * @desc Initialize season trackers for a league (e.g. 2010-2025)
 * @body { leagueId, startYear, endYear }
 */
import { importLeagueV3, getCountriesV3, getLeaguesV3, importBatchV3, getStandingsV3, getFixturesV3, syncPlayerCareerV3, getAvailableSeasons } from '../controllers/v3/importControllerV3.js';
import { getSeasonOverview, getTeamSquad, getSeasonPlayers } from '../controllers/v3/seasonController.js';
import { getPlayerProfileV3 } from '../controllers/v3/playerController.js';
import { getV3Stats, getImportedLeagues, getDiscoveredLeagues } from '../controllers/v3/dashboardController.js';
import { searchV3, getClubProfile, getSearchCountries } from '../controllers/v3/searchController.js';

router.get('/stats', getV3Stats);
router.get('/leagues/imported', getImportedLeagues);
router.get('/leagues/discovered', getDiscoveredLeagues);
router.post('/leagues/seasons/init', validateRequest(initSeasonsSchema), initializeSeasons);

/**
 * @route GET /api/countries
 * @desc Get all countries (for dropdown)
 */
router.get('/countries', getCountriesV3);

/**
 * @route GET /api/leagues
 * @desc Get leagues filtered by country
 */
router.get('/leagues', getLeaguesV3);

/**
 * @route GET /api/league/:id/season/:year
 * @desc Get aggregated season overview (standings, leaders)
 */
router.get('/league/:id/season/:year', getSeasonOverview);
router.get('/league/:id/season/:year/players', getSeasonPlayers);

/**
 * @route GET /api/league/:leagueId/season/:year/team/:teamId/squad
 * @desc Get squad for a specific team/season
 */
router.get('/league/:leagueId/season/:year/team/:teamId/squad', getTeamSquad);

/**
 * @desc Get standings for a league/season
 */
import { getDynamicStandings } from '../controllers/v3/seasonController.js';
router.get('/standings/dynamic', getDynamicStandings);
router.get('/league/:id/standings', getStandingsV3);

/**
 * @route GET /api/league/:id/fixtures
 * @desc Get fixtures for a league/season
 */
router.get('/league/:id/fixtures', getFixturesV3);

/**
 * @route Fixture Events (Data Engine)
 * @desc Sync and Serve Match Events
 */
import { getEventCandidates, syncFixtureEvents, getFixtureEvents, getFixtureDetails } from '../controllers/v3/fixtureController.js';
import { getLineups, getLineupCandidates, importLineupsBatch } from '../controllers/v3/lineupController.js';

router.get('/fixtures/events/candidates', getEventCandidates);
router.post('/fixtures/events/sync', validateRequest(syncEventsSchema), syncFixtureEvents);
router.get('/fixtures/:id/events', getFixtureEvents);
router.get('/fixtures/:id', getFixtureDetails); // New Header Route
router.get('/fixtures/:id/lineups', getLineups);

router.get('/fixtures/lineups/candidates', getLineupCandidates);
router.post('/fixtures/lineups/import', validateRequest(importLineupsSchema), importLineupsBatch);

/**
 * @route Predictions System
 */
import { syncUpcomingProps, getPredictions } from '../controllers/v3/predictionController.js';
router.post('/predictions/sync', validateRequest(predictionsSyncSchema), syncUpcomingProps);
router.get('/predictions', getPredictions);

/**
 * @route GET /api/league/:apiId/available-seasons
 * @desc Get all available seasons from API for a league, cross-referenced with local DB
 */
router.get('/league/:apiId/available-seasons', getAvailableSeasons);

/**
 * @route GET /api/player/:id
 * @desc Get player profile and career history
 */
router.get('/player/:id', getPlayerProfileV3);

/**
 * @route GET /api/search
 * @desc Search players & clubs
 */
// Search System
router.get('/search', validateRequest(searchSchema), searchV3);
router.get('/search/countries', getSearchCountries);

/**
 * @route GET /api/club/:id
 */
router.get('/club/:id', getClubProfile);

/** 
 * Import System with Validation 
 */
router.post('/import/league', validateRequest(importLeagueSchema), importLeagueV3);
router.post('/import/batch', validateRequest(importBatchSchema), importBatchV3);


/**
 * @route Studio Data Engine
 * @desc Endpoints for the Content Studio visualization feature
 */
import { getStudioStats, getStudioLeagues, searchStudioPlayers, searchStudioTeams, queryStudioData, getStudioNationalities, queryLeagueRankings } from '../controllers/v3/studioController.js';

router.get('/studio/meta/stats', getStudioStats);
router.get('/studio/meta/leagues', getStudioLeagues);
router.get('/studio/meta/nationalities', getStudioNationalities);
router.get('/studio/meta/players', searchStudioPlayers);
router.get('/studio/meta/teams', searchStudioTeams);
router.post('/studio/query', validateRequest(studioQuerySchema), queryStudioData);
router.post('/studio/query/league-rankings', validateRequest(studioRankingsSchema), queryLeagueRankings);



/**
 * @route POST /api/player/:id/sync-career
 * @desc Deep-career backfill for a player
 */
router.post('/player/:id/sync-career', validateRequest(syncCareerSchema), syncPlayerCareerV3);

/**
 * @route DB Health Check
 */
import { getDbHealth, fixDbHealth, getLeagueNames, checkLeagueHealthName, revertCleanup, checkDeepHealth, fixAllIssues, getCleanupHistory } from '../controllers/v3/adminController.js';

router.get('/admin/health', getDbHealth);
router.post('/admin/health/fix', validateRequest(healthFixSchema), fixDbHealth);
router.post('/admin/health/fix-all', validateRequest(healthFixAllSchema), fixAllIssues);
router.get('/admin/health/history', getCleanupHistory);
router.post('/admin/health/revert/:groupId', validateRequest(healthRevertSchema), revertCleanup);
router.post('/admin/health/revert/id/:groupId', validateRequest(healthRevertSchema), revertCleanup); // Supporting both formats
router.get('/admin/health/leagues', getLeagueNames);
router.post('/admin/health/check-league', validateRequest(healthCheckLeagueSchema), checkLeagueHealthName);
router.post('/admin/health/check-deep', validateRequest(healthCheckDeepSchema), checkDeepHealth);

/**
 * @route Trophies System
 */
import { importPlayerTrophies, getPlayersMissingTrophies, getPlayerTrophiesLocal, getNationalities, getPlayersByNationality } from '../controllers/v3/trophyController.js';

router.post('/import/trophies', validateRequest(importTrophiesSchema), importPlayerTrophies);
router.get('/import/trophies/candidates', getPlayersMissingTrophies);
router.get('/player/:id/trophies', getPlayerTrophiesLocal);
router.get('/players/nationalities', getNationalities);
router.get('/players/by-nationality', getPlayersByNationality);

/**
 * @route Live Bet System (US_010, US_011, US_012)
 */
import { getDailyFixtures, getUpcomingFixtures, getMatchDetails, saveMatchOdds } from '../controllers/v3/liveBetController.js';

router.get('/live-bet/fixtures', getDailyFixtures);
router.get('/live-bet/upcoming', getUpcomingFixtures);
router.get('/live-bet/match/:id', getMatchDetails);
router.post('/live-bet/match/:id/save-odds', saveMatchOdds);

/**
 * @route Preferences (US_017)
 */
import { getPreferences, updatePreferences } from '../controllers/v3/preferencesController.js';

router.get('/preferences', getPreferences);
router.put('/preferences', validateRequest(preferencesSchema), updatePreferences);

export default router;
