import express from 'express';
import { getV3Stats, getImportedLeagues, getDiscoveredLeagues } from '../../controllers/v3/dashboardController.js';

const router = express.Router();

router.get('/stats', getV3Stats);
router.get('/leagues/imported', getImportedLeagues);
router.get('/leagues/discovered', getDiscoveredLeagues);

export default router;
