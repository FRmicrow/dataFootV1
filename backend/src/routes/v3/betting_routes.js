import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    predictionsSyncSchema,
    toggleMonitoringSchema,
    bulkOddsSchema
} from '../../schemas/v3Schemas.js';
import {
    syncUpcomingProps,
    getPredictions
} from '../../controllers/v3/predictionController.js';
import {
    getDailyFixtures,
    getUpcomingFixtures,
    getMatchDetails,
    saveMatchOdds,
    getMonitoringLeagues,
    toggleLeagueMonitoring
} from '../../controllers/v3/liveBetController.js';
import {
    triggerFixtureDepthIngestion,
    triggerDateBulkIngestion
} from '../../controllers/v3/bulkOddsController.js';

const router = express.Router();

// Predictions
router.post('/predictions/sync', validateRequest(predictionsSyncSchema), syncUpcomingProps);
router.get('/predictions', getPredictions);

// Live Bet
router.get('/live-bet/fixtures', getDailyFixtures);
router.get('/live-bet/upcoming', getUpcomingFixtures);
router.get('/live-bet/match/:id', getMatchDetails);
router.post('/live-bet/match/:id/save-odds', saveMatchOdds);
router.get('/live-bet/leagues/monitoring', getMonitoringLeagues);
router.put('/live-bet/leagues/:id/monitoring', validateRequest(toggleMonitoringSchema), toggleLeagueMonitoring);

// Bulk Odds
router.post('/live-bet/odds/fixture/:id', triggerFixtureDepthIngestion);
router.post('/live-bet/odds/ingest-date', validateRequest(bulkOddsSchema), triggerDateBulkIngestion);

export default router;
