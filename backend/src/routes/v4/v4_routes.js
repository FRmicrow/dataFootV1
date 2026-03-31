import express from 'express';
import leagueRoutesV4 from './league_routes.js';

const router = express.Router();

/**
 * V4 - Transfermarkt Historical Data Layer
 * Base Prefix mapping
 */
router.use('/v4', leagueRoutesV4);

export default router;
