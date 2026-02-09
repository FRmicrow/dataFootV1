import express from 'express';
import { searchPlayers, searchTeams, getQueueStatus, getPlayersByTeam } from '../controllers/searchController.js';
import { getAllPlayers, getNationalities, getPlayerDetail, getTeamDetail, searchPlayers as searchPlayersV2, getTeamSeasonStats, deletePlayer } from '../controllers/playerController.js';
import { getPalmaresHierarchy, getTrophyHistory, updateTrophyWinner } from '../controllers/palmaresController.js';
import { getTeamsByLeague, getTeamById, getTeamPlayers, searchTeams as searchTeamsV2, getCountriesForTeams, getLeaguesMetadata, getTeamsByCompetition } from '../controllers/teamController.js';
import { searchPlayers as searchPlayersData, searchClubs as searchClubsData, getAllCountries, getAllClubs } from '../controllers/footballDataController.js';
import { getClubDetails, getClubPlayers, getPlayerClubDetails, getClubHistory, getClubTrophies } from '../controllers/clubController.js';
import * as competitionController from '../controllers/competitionController.js';


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
router.get('/teams/by-league', getTeamsByLeague);
router.get('/teams/leagues-metadata', getLeaguesMetadata);
router.get('/teams/competition/:competitionId', getTeamsByCompetition);
router.get('/teams/:id', getTeamById);
router.get('/teams/:id/players', getTeamPlayers);
router.get('/teams/search', searchTeamsV2);
router.get('/teams/countries', getCountriesForTeams);

// Palmares routes
router.get('/palmares/hierarchy', getPalmaresHierarchy);
router.get('/palmares/history/:trophyId', getTrophyHistory);
router.post('/palmares/winner/:trophyId/:seasonId', updateTrophyWinner);

// Football Data routes
router.get('/football-data/players/search', searchPlayersData);
router.get('/football-data/clubs/search', searchClubsData);
router.get('/football-data/countries', getAllCountries);
router.get('/football-data/clubs', getAllClubs);

// Club Detail routes
router.get('/clubs/:clubId', getClubDetails);
router.get('/clubs/:clubId/players', getClubPlayers);
router.get('/clubs/:clubId/players/:playerId/details', getPlayerClubDetails);
router.get('/clubs/:clubId/history', getClubHistory);
router.get('/clubs/:clubId/trophies', getClubTrophies);

// Competition routes
router.get('/competitions/:id', competitionController.getCompetitionBasicInfo);
router.get('/competitions/:id/seasons', competitionController.getCompetitionSeasons);
router.get('/competitions/:id/season/:year', competitionController.getCompetitionSeasonDetails);

import { importLeagueV3, getCountriesV3, getLeaguesV3, importBatchV3 } from '../controllers/v3/importControllerV3.js';
import { getV3Stats, getImportedLeagues } from '../controllers/v3/dashboardController.js';

// V3 Routes
router.get('/v3/stats', getV3Stats);
router.get('/v3/leagues/imported', getImportedLeagues);
router.get('/v3/countries', getCountriesV3);
router.get('/v3/leagues', getLeaguesV3);
router.post('/v3/import/league', importLeagueV3);
router.post('/v3/import/batch', importBatchV3);

export default router;
