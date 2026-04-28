import express from 'express';
import leagueRoutesV4 from './league_routes.js';
import oddsRoutesV4 from './odds_routes.js';
import xgRoutesV4 from './xg_routes.js';
import mlRoutesV4 from './ml_routes_v4.js';
import clubRoutesV4 from './club_routes.js';
import adminRoutesV4 from './admin_routes.js';
import studioRoutesV4 from './studio_routes.js';

const router = express.Router();

/**
 * V4 - Transfermarkt Historical Data Layer
 * Base Prefix mapping
 */
router.use('/v4', leagueRoutesV4);
router.use('/v4', oddsRoutesV4);
router.use('/v4', xgRoutesV4);
router.use('/v4', mlRoutesV4);
router.use('/v4', clubRoutesV4);
router.use('/v4/admin', adminRoutesV4);
router.use('/v4/studio', studioRoutesV4); // V48 Phase 2 — Infographic Studio

export default router;
