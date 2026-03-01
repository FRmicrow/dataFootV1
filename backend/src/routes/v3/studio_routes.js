import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import { studioQuerySchema, studioRankingsSchema } from '../../schemas/v3Schemas.js';
import {
    getStudioStats,
    getStudioLeagues,
    searchStudioPlayers,
    searchStudioTeams,
    queryStudioData,
    getStudioNationalities,
    queryLeagueRankings
} from '../../controllers/v3/studioController.js';

const router = express.Router();

// Studio
router.get('/studio/meta/stats', getStudioStats);
router.get('/studio/meta/leagues', getStudioLeagues);
router.get('/studio/meta/nationalities', getStudioNationalities);
router.get('/studio/meta/players', searchStudioPlayers);
router.get('/studio/meta/teams', searchStudioTeams);
router.post('/studio/query', validateRequest(studioQuerySchema), queryStudioData);
router.post('/studio/query/league-rankings', validateRequest(studioRankingsSchema), queryLeagueRankings);

export default router;
