import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import { syncEventsSchema, importLineupsSchema } from '../../schemas/v3Schemas.js';
import {
    getEventCandidates,
    syncFixtureEvents,
    getFixtureEvents,
    getFixtureDetails,
    getFixtureTacticalStats,
    getFixturePlayerTacticalStats
} from '../../controllers/v3/fixtureController.js';
import {
    getLineups,
    getLineupCandidates,
    importLineupsBatch
} from '../../controllers/v3/lineupController.js';

const router = express.Router();

router.get('/fixtures/events/candidates', getEventCandidates);
router.post('/fixtures/events/sync', validateRequest(syncEventsSchema), syncFixtureEvents);
router.get('/fixtures/:id/events', getFixtureEvents);
router.get('/fixtures/:id/tactical-stats', getFixtureTacticalStats);
router.get('/fixtures/:id/player-stats', getFixturePlayerTacticalStats);
router.get('/fixtures/:id', getFixtureDetails);
router.get('/fixtures/:id/lineups', getLineups);
router.get('/fixtures/lineups/candidates', getLineupCandidates);
router.post('/fixtures/lineups/import', validateRequest(importLineupsSchema), importLineupsBatch);

export default router;
