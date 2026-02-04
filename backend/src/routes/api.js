import express from 'express';
import { searchPlayers, searchTeams, getQueueStatus, getPlayersByTeam } from '../controllers/searchController.js';
import { getAllPlayers, getNationalities, getPlayerDetail, getTeamDetail, searchPlayers as searchPlayersV2, getTeamSeasonStats, deletePlayer } from '../controllers/playerController.js';
import { getPalmaresHierarchy, getTrophyHistory, updateTrophyWinner } from '../controllers/palmaresController.js';

const router = express.Router();

// Search routes
router.get('/search', searchPlayers);
router.get('/search/teams', searchTeams);
router.get('/search/players-by-team', getPlayersByTeam);
router.get('/queue-status', getQueueStatus);

// Player data routes (V2 schema only)
router.get('/players', getAllPlayers);
router.get('/nationalities', getNationalities);
router.get('/player/:id', getPlayerDetail);
router.delete('/player/:id', deletePlayer);

// Team data routes (V2 schema only)
router.get('/team/:id', getTeamDetail);
router.get('/team/:id/season/:season', getTeamSeasonStats);

// Palmares routes
router.get('/palmares/hierarchy', getPalmaresHierarchy);
router.get('/palmares/history/:trophyId', getTrophyHistory);
router.post('/palmares/winner/:trophyId/:seasonId', updateTrophyWinner);

export default router;
