import express from 'express';

// Domain Router Imports
import dashboardRoutes from './v3/dashboard_routes.js';
import leagueRoutes from './v3/league_routes.js';
import fixtureRoutes from './v3/fixture_routes.js';
import playerRoutes from './v3/player_routes.js';
import importRoutes from './v3/import_routes.js';
import adminRoutes from './v3/admin_routes.js';
import bettingRoutes from './v3/betting_routes.js';
import mlRoutes from './v3/ml_routes.js';
import resolutionRoutes from './v3/resolution_routes.js';
import studioRoutes from './v3/studio_routes.js';

const router = express.Router();

/**
 * V3 Modular Routing Hub (Backward Compatible)
 * Maps split routers to the root to maintain original endpoint URLs.
 */

router.use('/', dashboardRoutes);
router.use('/', leagueRoutes);
router.use('/', fixtureRoutes);
router.use('/', playerRoutes);
router.use('/', importRoutes);
router.use('/', adminRoutes);
router.use('/', bettingRoutes);
router.use('/', mlRoutes);
router.use('/', resolutionRoutes);
router.use('/', studioRoutes);

export default router;
