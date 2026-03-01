import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import { searchSchema, syncCareerSchema, importTrophiesSchema } from '../../schemas/v3Schemas.js';
import { getPlayerProfileV3 } from '../../controllers/v3/playerController.js';
import { syncPlayerCareerV3 } from '../../controllers/v3/importControllerV3.js';
import { searchV3, getSearchCountries } from '../../controllers/v3/searchController.js';
import { getClubProfile, getClubTacticalSummary, getClubMatches } from '../../controllers/v3/clubController.js';
import { getTypicalLineup } from '../../controllers/v3/lineupController.js';
import {
    importPlayerTrophies,
    getPlayersMissingTrophies,
    getPlayerTrophiesLocal,
    getNationalities,
    getPlayersByNationality
} from '../../controllers/v3/trophyController.js';

const router = express.Router();

// Players
router.get('/player/:id', getPlayerProfileV3);
router.post('/player/:id/sync-career', validateRequest(syncCareerSchema), syncPlayerCareerV3);
router.get('/search', validateRequest(searchSchema), searchV3);
router.get('/search/countries', getSearchCountries);

// Clubs
router.get('/club/:id', getClubProfile);
router.get('/club/:id/tactical-summary', getClubTacticalSummary);
router.get('/club/:id/matches', getClubMatches);
router.get('/club/:id/typical-lineup', getTypicalLineup);

// Trophies System
router.post('/import/trophies', validateRequest(importTrophiesSchema), importPlayerTrophies);
router.get('/import/trophies/candidates', getPlayersMissingTrophies);
router.get('/player/:id/trophies', getPlayerTrophiesLocal);
router.get('/players/nationalities', getNationalities);
router.get('/players/by-nationality', getPlayersByNationality);

export default router;
