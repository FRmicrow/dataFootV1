import express from 'express';
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
    preferencesSchema,
    mergeSchema,
    duplicatesSchema,
    prescriptionExecuteSchema,
    prescriptionListSchema,
    toggleMonitoringSchema,
    bulkOddsSchema,
    mlTrainSchema,
    leagueIdParamSchema,
    simulationStatusSchema,
    breedingSchema,
    breedingStatusSchema,
    leagueIdV3ParamSchema,
    tacticalStatsSchema
} from '../schemas/v3Schemas.js';

// Controller Imports
import { getLeagueSeasonsStatus, initializeSeasons, getSyncStatus } from '../controllers/v3/leagueSeasonController.js';
import { getStructuredLeagues } from '../controllers/v3/leagueStructuredController.js';
import {
    importLeagueV3,
    getCountriesV3,
    getLeaguesV3,
    importBatchV3,
    getStandingsV3,
    getFixturesV3,
    syncPlayerCareerV3,
    getAvailableSeasons
} from '../controllers/v3/importControllerV3.js';
import {
    getSeasonOverview,
    getTeamSquad,
    getSeasonPlayers,
    getDynamicStandings
} from '../controllers/v3/seasonController.js';
import { getPlayerProfileV3 } from '../controllers/v3/playerController.js';
import {
    getV3Stats,
    getImportedLeagues,
    getDiscoveredLeagues
} from '../controllers/v3/dashboardController.js';
import {
    searchV3,
    getSearchCountries
} from '../controllers/v3/searchController.js';
import {
    getClubProfile,
    getClubTacticalSummary,
    getClubMatches
} from '../controllers/v3/clubController.js';
import {
    getEventCandidates,
    syncFixtureEvents,
    getFixtureEvents,
    getFixtureDetails,
    getFixtureTacticalStats,
    getFixturePlayerTacticalStats
} from '../controllers/v3/fixtureController.js';
import {
    getLineups,
    getLineupCandidates,
    importLineupsBatch,
    getTypicalLineup
} from '../controllers/v3/lineupController.js';
import {
    syncUpcomingProps,
    getPredictions
} from '../controllers/v3/predictionController.js';
import {
    getStudioStats,
    getStudioLeagues,
    searchStudioPlayers,
    searchStudioTeams,
    queryStudioData,
    getStudioNationalities,
    queryLeagueRankings
} from '../controllers/v3/studioController.js';
import {
    getDbHealth,
    fixDbHealth,
    getLeagueNames,
    checkLeagueHealthName,
    revertCleanup,
    checkDeepHealth,
    fixAllIssues,
    getCleanupHistory
} from '../controllers/v3/adminController.js';
import {
    importPlayerTrophies,
    getPlayersMissingTrophies,
    getPlayerTrophiesLocal,
    getNationalities,
    getPlayersByNationality
} from '../controllers/v3/trophyController.js';
import {
    getDailyFixtures,
    getUpcomingFixtures,
    getMatchDetails,
    saveMatchOdds,
    getMonitoringLeagues,
    toggleLeagueMonitoring
} from '../controllers/v3/liveBetController.js';
import {
    triggerFixtureDepthIngestion,
    triggerDateBulkIngestion
} from '../controllers/v3/bulkOddsController.js';
import {
    getPreferences,
    updatePreferences
} from '../controllers/v3/preferencesController.js';
import {
    getImportMatrixStatus,
    triggerAuditScan,
    triggerDeepSync,
    triggerBatchDeepSync,
    resetImportStatus,
    stopImport,
    pauseImport,
    resumeImport,
    getImportStateEndpoint
} from '../controllers/v3/importMatrixController.js';
import {
    getPotentialDuplicates,
    mergePlayers
} from '../controllers/v3/resolutionController.js';
import {
    generatePrescriptions,
    getPrescriptions,
    executePrescription
} from '../controllers/v3/healthController.js';
import {
    getBacktest,
    getCalibrationAudit
} from '../controllers/v3/intelligenceController.js';
import {
    triggerModelRetrain,
    getModelStatus,
    buildForgeModels,
    getForgeBuildStatus,
    cancelForgeBuild,
    getForgeModels,
    retrainModel,
    getRetrainStatus,
    getEligibleHorizons,
    getLeagueModels
} from '../controllers/v3/mlController.js';
import {
    triggerSimulation,
    checkJobStatus,
    getSimulationResults,
    checkSimulationReadiness,
    triggerBulkSimulation,
    checkBulkJobStatus,
    getLeagueSimulations
} from '../controllers/v3/simulationController.js';
import { startBreeding, getBreedingStatus } from '../controllers/v3/forgeLaboratoryController.js';
import {
    triggerFixtureStatsSync,
    triggerPlayerStatsSync,
    triggerNormalization
} from '../controllers/v3/tacticalStatsController.js';

const router = express.Router();

/**
 * @route Stats & Dashboard
 */
router.get('/stats', getV3Stats);
router.get('/leagues/imported', getImportedLeagues);
router.get('/leagues/discovered', getDiscoveredLeagues);

/**
 * @route Countries & Leagues
 */
router.get('/countries', getCountriesV3);
router.get('/leagues', getLeaguesV3);
router.get('/leagues/structured', getStructuredLeagues);

/**
 * @route Season Tracking
 */
router.get('/leagues/:id/seasons', validateRequest(leagueIdParamSchema), getLeagueSeasonsStatus);
router.get('/league/:id/sync-status', validateRequest(leagueIdParamSchema), getSyncStatus);
router.post('/leagues/seasons/init', validateRequest(initSeasonsSchema), initializeSeasons);
router.get('/league/:id/season/:year', getSeasonOverview);
router.get('/league/:id/season/:year/players', getSeasonPlayers);
router.get('/league/:leagueId/season/:year/club/:teamId/squad', getTeamSquad);
router.get('/league/:apiId/available-seasons', getAvailableSeasons);

/**
 * @route Standings & Fixtures
 */
router.get('/standings/dynamic', getDynamicStandings);
router.get('/league/:id/standings', getStandingsV3);
router.get('/league/:id/fixtures', getFixturesV3);

/**
 * @route Fixture Events & Lineups
 */
router.get('/fixtures/events/candidates', getEventCandidates);
router.post('/fixtures/events/sync', validateRequest(syncEventsSchema), syncFixtureEvents);
router.get('/fixtures/:id/events', getFixtureEvents);
router.get('/fixtures/:id/tactical-stats', getFixtureTacticalStats);
router.get('/fixtures/:id/player-stats', getFixturePlayerTacticalStats);
router.get('/fixtures/:id', getFixtureDetails);
router.get('/fixtures/:id/lineups', getLineups);
router.get('/fixtures/lineups/candidates', getLineupCandidates);
router.post('/fixtures/lineups/import', validateRequest(importLineupsSchema), importLineupsBatch);

/**
 * @route Predictions System
 */
router.post('/predictions/sync', validateRequest(predictionsSyncSchema), syncUpcomingProps);
router.get('/predictions', getPredictions);

/**
 * @route Player & Search
 */
router.get('/player/:id', getPlayerProfileV3);
router.post('/player/:id/sync-career', validateRequest(syncCareerSchema), syncPlayerCareerV3);
router.get('/search', validateRequest(searchSchema), searchV3);
router.get('/search/countries', getSearchCountries);
router.get('/club/:id', getClubProfile);
router.get('/club/:id/tactical-summary', getClubTacticalSummary);
router.get('/club/:id/matches', getClubMatches);
router.get('/club/:id/typical-lineup', getTypicalLineup);

/** 
 * Import System 
 */
router.post('/import/league', validateRequest(importLeagueSchema), importLeagueV3);
router.post('/import/batch', validateRequest(importBatchSchema), importBatchV3);
router.post('/import/fixture-stats', validateRequest(tacticalStatsSchema), triggerFixtureStatsSync);
router.post('/import/player-stats', validateRequest(tacticalStatsSchema), triggerPlayerStatsSync);
router.post('/import/normalize', triggerNormalization);

/**
 * @route Studio Data Engine
 */
router.get('/studio/meta/stats', getStudioStats);
router.get('/studio/meta/leagues', getStudioLeagues);
router.get('/studio/meta/nationalities', getStudioNationalities);
router.get('/studio/meta/players', searchStudioPlayers);
router.get('/studio/meta/teams', searchStudioTeams);
router.post('/studio/query', validateRequest(studioQuerySchema), queryStudioData);
router.post('/studio/query/league-rankings', validateRequest(studioRankingsSchema), queryLeagueRankings);

/**
 * @route DB Health & Admin
 */
router.get('/admin/health', getDbHealth);
router.post('/admin/health/fix', validateRequest(healthFixSchema), fixDbHealth);
router.post('/admin/health/fix-all', validateRequest(healthFixAllSchema), fixAllIssues);
router.get('/admin/health/history', getCleanupHistory);
router.post('/admin/health/revert/:groupId', validateRequest(healthRevertSchema), revertCleanup);
router.post('/admin/health/revert/id/:groupId', validateRequest(healthRevertSchema), revertCleanup);
router.get('/admin/health/leagues', getLeagueNames);
router.post('/admin/health/check-league', validateRequest(healthCheckLeagueSchema), checkLeagueHealthName);
router.post('/admin/health/check-deep', validateRequest(healthCheckDeepSchema), checkDeepHealth);

/**
 * @route Trophies System
 */
router.post('/import/trophies', validateRequest(importTrophiesSchema), importPlayerTrophies);
router.get('/import/trophies/candidates', getPlayersMissingTrophies);
router.get('/player/:id/trophies', getPlayerTrophiesLocal);
router.get('/players/nationalities', getNationalities);
router.get('/players/by-nationality', getPlayersByNationality);

/**
 * @route Live Bet System
 */
router.get('/live-bet/fixtures', getDailyFixtures);
router.get('/live-bet/upcoming', getUpcomingFixtures);
router.get('/live-bet/match/:id', getMatchDetails);
router.post('/live-bet/match/:id/save-odds', saveMatchOdds);
router.get('/live-bet/leagues/monitoring', getMonitoringLeagues);
router.put('/live-bet/leagues/:id/monitoring', validateRequest(toggleMonitoringSchema), toggleLeagueMonitoring);

/**
 * @route Bulk Odds Ingestion
 */
router.post('/live-bet/odds/fixture/:id', triggerFixtureDepthIngestion);
router.post('/live-bet/odds/ingest-date', validateRequest(bulkOddsSchema), triggerDateBulkIngestion);

/**
 * @route Preferences
 */
router.get('/preferences', getPreferences);
router.put('/preferences', validateRequest(preferencesSchema), updatePreferences);

/**
 * @route Import Matrix
 */
router.get('/import/matrix-status', getImportMatrixStatus);
router.post('/import/audit-scan', triggerAuditScan);
router.post('/import/league/:id/deep-sync', triggerDeepSync); // US_269: Returns 410 Gone
router.post('/import/leagues/batch-deep-sync', triggerBatchDeepSync);
router.post('/import/status/reset', resetImportStatus); // US_270: Manual override
router.post('/import/stop', stopImport);
router.post('/import/pause', pauseImport);
router.post('/import/resume', resumeImport);
router.get('/import/state', getImportStateEndpoint);

/**
 * @route Entity Resolution
 */
router.get('/resolution/duplicates', validateRequest(duplicatesSchema), getPotentialDuplicates);
router.post('/resolution/merge', validateRequest(mergeSchema), mergePlayers);

/**
 * @route Health Prescriptions
 */
router.post('/health/prescribe', generatePrescriptions);
router.get('/health/prescriptions', validateRequest(prescriptionListSchema), getPrescriptions);
router.post('/health/execute', validateRequest(prescriptionExecuteSchema), executePrescription);

/**
 * @route Intelligence Hub
 */
router.get('/intelligence/backtest', getBacktest);
router.get('/intelligence/audit', getCalibrationAudit);

/**
 * @route ML Management
 */
router.post('/ml/train', validateRequest(mlTrainSchema), triggerModelRetrain);
router.get('/ml/status', getModelStatus);
router.post('/forge/build-models', buildForgeModels);
router.get('/forge/build-status', getForgeBuildStatus);
router.post('/forge/cancel-build', cancelForgeBuild);
router.get('/forge/models', getForgeModels);
router.post('/forge/retrain', retrainModel);
router.get('/forge/retrain-status', getRetrainStatus);
router.get('/forge/eligible-horizons', getEligibleHorizons);
router.get('/forge/league-models/:leagueId', validateRequest(leagueIdV3ParamSchema), getLeagueModels);

/**
 * @route Forge Laboratory (PO Lifecycle)
 */
router.post('/forge/breed', validateRequest(breedingSchema), startBreeding);
router.get('/forge/breed-status', validateRequest(breedingStatusSchema), getBreedingStatus);

// Forge Simulation Engine (US_183, US_190)
router.post('/simulation/start', triggerSimulation);
router.get('/simulation/status', validateRequest(simulationStatusSchema), checkJobStatus);
router.get('/simulation/readiness', checkSimulationReadiness);
router.get('/simulation/results/:simId', getSimulationResults);
router.get('/simulation/league/:leagueId', getLeagueSimulations);
router.post('/simulation/bulk', triggerBulkSimulation);
router.get('/simulation/bulk/status', checkBulkJobStatus);

export default router;
