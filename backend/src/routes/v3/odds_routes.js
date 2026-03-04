import express from 'express';
import { getFixtureOdds, getUpcomingOdds, manualImportOdds } from '../../controllers/v3/oddsController.js';

const router = express.Router();

/**
 * @route GET /api/v3/odds/fixture/:fixtureId
 * @desc Get all pre-match odds for a specific match
 */
router.get('/fixture/:fixtureId', getFixtureOdds);

/**
 * @route GET /api/v3/odds/upcoming
 * @desc List fixtures that have pre-match odds available for the upcoming days
 */
router.get('/upcoming', getUpcomingOdds);

/**
 * @route POST /api/v3/odds/import
 * @desc Manually trigger an odds import from API-Football for a league/season
 */
router.post('/import', manualImportOdds);

export default router;
