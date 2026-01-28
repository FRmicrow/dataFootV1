import express from 'express';
import { searchPlayers, searchTeams, getQueueStatus, getPlayersByTeam } from '../controllers/searchController.js';
import { importPlayer, importTeam, getImportProgress, retryFailedImport, getImportMetadata, syncPlayerData, verifyDatabase, getMassVerifyStatus, getUnclassifiedLeagues, classifyLeagueManually, importBatch, getBatchProgress } from '../controllers/importController.js';
import { getAllPlayers, getPlayerById, getAllTeams, getTeamData, deletePlayer, getTeamStatistics, getTeamTrophies } from '../controllers/playerController.js';

const router = express.Router();

// Search routes
router.get('/search', searchPlayers);
router.get('/search/teams', searchTeams);
router.get('/search/players-by-team', getPlayersByTeam);
router.get('/queue-status', getQueueStatus);

// Import routes
router.post('/import/batch', importBatch);
router.get('/import/batch/:batchId', getBatchProgress);
router.post('/import/:playerId', importPlayer);
router.post('/import/team/:teamId', importTeam);
router.get('/import-metadata/:playerId', getImportMetadata);
router.get('/import-progress/:playerId', getImportProgress);
router.post('/retry-import/:playerId', retryFailedImport);
router.post('/verify-database', verifyDatabase);
router.get('/verify-status', getMassVerifyStatus);

// Player data routes (from local database)
router.get('/players', getAllPlayers);
router.get('/player/:id', getPlayerById);
router.delete('/player/:id', deletePlayer);
router.post('/player/:playerId/sync', syncPlayerData);

// Team data routes
router.get('/teams', getAllTeams);
router.get('/team/:id', getTeamData);
router.get('/team/:id/statistics', getTeamStatistics);
router.get('/team/:id/trophies', getTeamTrophies);

// League classification routes
router.get('/leagues/unclassified', getUnclassifiedLeagues);
router.post('/leagues/:leagueId/classify', classifyLeagueManually);

import { getPalmaresHierarchy, getTrophyHistory, updateTrophyWinner } from '../controllers/palmaresController.js';

// ... existing imports ...

// Palmares routes
router.get('/palmares/hierarchy', getPalmaresHierarchy);
router.get('/palmares/history/:trophyId', getTrophyHistory);
router.post('/palmares/winner/:trophyId/:seasonId', updateTrophyWinner);

export default router;
