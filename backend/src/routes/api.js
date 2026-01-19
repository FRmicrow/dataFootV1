import express from 'express';
import { searchPlayers, searchTeams, getQueueStatus, getPlayersByTeam } from '../controllers/searchController.js';
import { importPlayer, importTeam, getImportProgress, retryFailedImport, getImportMetadata, syncPlayerData, verifyDatabase, getMassVerifyStatus, getUnclassifiedLeagues, classifyLeagueManually } from '../controllers/importController.js';
import { getAllPlayers, getPlayerById, getAllTeams, getTeamData, deletePlayer } from '../controllers/playerController.js';
import { importFromFbref } from '../controllers/fbrefController.js';

const router = express.Router();

// Search routes
router.get('/search', searchPlayers);
router.get('/search/teams', searchTeams);
router.get('/search/players-by-team', getPlayersByTeam);
router.get('/queue-status', getQueueStatus);

// Import routes
router.post('/import/:playerId', importPlayer);
router.post('/import/team/:teamId', importTeam);
router.get('/import-metadata/:playerId', getImportMetadata);
router.get('/import-progress/:playerId', getImportProgress);
router.post('/retry-import/:playerId', retryFailedImport);
router.post('/import/fbref', importFromFbref);
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

// League classification routes
router.get('/leagues/unclassified', getUnclassifiedLeagues);
router.post('/leagues/:leagueId/classify', classifyLeagueManually);

export default router;
