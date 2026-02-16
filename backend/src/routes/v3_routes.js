import express from 'express';
import { getLeagueSeasonsStatus, initializeSeasons, getSyncStatus } from '../controllers/v3/leagueSeasonController.js';

const router = express.Router();

/**
 * @route GET /api/v3/leagues/:id/seasons
 * @desc Get the Granular Tracker status for a league
 */
router.get('/leagues/:id/seasons', getLeagueSeasonsStatus);
router.get('/league/:id/sync-status', getSyncStatus);

/**
 * @route POST /api/v3/leagues/seasons/init
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
router.post('/leagues/seasons/init', initializeSeasons);

/**
 * @route GET /api/v3/countries
 * @desc Get all countries (for dropdown)
 */
router.get('/countries', getCountriesV3);

/**
 * @route GET /api/v3/leagues
 * @desc Get leagues filtered by country
 */
router.get('/leagues', getLeaguesV3);

/**
 * @route GET /api/v3/league/:id/season/:year
 * @desc Get aggregated season overview (standings, leaders)
 */
router.get('/league/:id/season/:year', getSeasonOverview);
router.get('/league/:id/season/:year/players', getSeasonPlayers);

/**
 * @route GET /api/v3/league/:leagueId/season/:year/team/:teamId/squad
 * @desc Get squad for a specific team/season
 */
router.get('/league/:leagueId/season/:year/team/:teamId/squad', getTeamSquad);

/**
 * @route GET /api/v3/league/:id/standings
 * @desc Get standings for a league/season
 */
router.get('/league/:id/standings', getStandingsV3);

/**
 * @route GET /api/v3/league/:id/fixtures
 * @desc Get fixtures for a league/season
 */
router.get('/league/:id/fixtures', getFixturesV3);

/**
 * @route Fixture Events (Data Engine)
 * @desc Sync and Serve Match Events
 */
import { getEventCandidates, syncFixtureEvents, getFixtureEvents } from '../controllers/v3/fixtureController.js';

router.get('/fixtures/events/candidates', getEventCandidates);
router.post('/fixtures/events/sync', syncFixtureEvents);
router.get('/fixtures/:id/events', getFixtureEvents);

/**
 * @route GET /api/v3/league/:apiId/available-seasons
 * @desc Get all available seasons from API for a league, cross-referenced with local DB
 */
router.get('/league/:apiId/available-seasons', getAvailableSeasons);

/**
 * @route GET /api/v3/player/:id
 * @desc Get player profile and career history
 */
router.get('/player/:id', getPlayerProfileV3);

/**
 * @route GET /api/v3/search
 * @desc Search players & clubs
 */
router.get('/search', searchV3);
router.get('/search/countries', getSearchCountries);

/**
 * @route GET /api/v3/club/:id
 * @desc Get club profile with seasons & roster
 */
router.get('/club/:id', getClubProfile);

/**
 * @route POST /api/v3/import/league
 * @desc Import full league data for a season to V3 tables
 */
router.post('/import/league', importLeagueV3);

/**
 * @route POST /api/v3/import/batch
 * @desc Batch import multiple leagues
 */
router.post('/import/batch', importBatchV3);


/**
 * @route Studio Data Engine
 * @desc Endpoints for the Content Studio visualization feature
 */
import { getStudioStats, getStudioLeagues, searchStudioPlayers, searchStudioTeams, queryStudioData, getStudioNationalities } from '../controllers/v3/studioController.js';

router.get('/studio/meta/stats', getStudioStats);
router.get('/studio/meta/leagues', getStudioLeagues);
router.get('/studio/meta/nationalities', getStudioNationalities);
router.get('/studio/meta/players', searchStudioPlayers);
router.get('/studio/meta/teams', searchStudioTeams);
router.post('/studio/query', queryStudioData);


/**
 * @route POST /api/v3/player/:id/sync-career
 * @desc Deep-career backfill for a player
 */
router.post('/player/:id/sync-career', syncPlayerCareerV3);

/**
 * @route DB Health Check
 */
import { getDbHealth, fixDbHealth, getLeagueNames, checkLeagueHealthName, revertCleanup, checkDeepHealth, fixAllIssues, getCleanupHistory } from '../controllers/v3/adminController.js';

router.get('/admin/health', getDbHealth);
router.post('/admin/health/fix', fixDbHealth);
router.post('/admin/health/fix-all', fixAllIssues);
router.get('/admin/health/history', getCleanupHistory);
router.post('/admin/health/revert/:groupId', revertCleanup);
router.post('/admin/health/revert/id/:groupId', revertCleanup); // Supporting both formats
router.get('/admin/health/leagues', getLeagueNames);
router.post('/admin/health/check-league', checkLeagueHealthName);
router.post('/admin/health/check-deep', checkDeepHealth);

/**
 * @route Trophies System
 */
import { importPlayerTrophies, getPlayersMissingTrophies, getPlayerTrophiesLocal, getNationalities, getPlayersByNationality } from '../controllers/v3/trophyController.js';

router.post('/import/trophies', importPlayerTrophies);
router.get('/import/trophies/candidates', getPlayersMissingTrophies);
router.get('/player/:id/trophies', getPlayerTrophiesLocal);
router.get('/players/nationalities', getNationalities);
router.get('/players/by-nationality', getPlayersByNationality);

export default router;
