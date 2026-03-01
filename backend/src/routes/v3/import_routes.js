import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    importLeagueSchema,
    importBatchSchema,
    tacticalStatsSchema
} from '../../schemas/v3Schemas.js';
import {
    importLeagueV3,
    importBatchV3
} from '../../controllers/v3/importControllerV3.js';
import {
    getImportMatrixStatus,
    triggerAuditScan,
    triggerDeepSync,
    triggerBatchDeepSync,
    resetImportStatus,
    stopImport,
    pauseImport,
    resumeImport,
    getImportStateEndpoint,
    getDiscoveryCountries,
    getDiscoveryLeagues,
    triggerDiscoveryImport
} from '../../controllers/v3/importMatrixController.js';
import {
    triggerFixtureStatsSync,
    triggerPlayerStatsSync,
    triggerNormalization
} from '../../controllers/v3/tacticalStatsController.js';

const router = express.Router();

// Import System
router.post('/import/league', validateRequest(importLeagueSchema), importLeagueV3);
router.post('/import/batch', validateRequest(importBatchSchema), importBatchV3);
router.post('/import/fixture-stats', validateRequest(tacticalStatsSchema), triggerFixtureStatsSync);
router.post('/import/player-stats', validateRequest(tacticalStatsSchema), triggerPlayerStatsSync);
router.post('/import/normalize', triggerNormalization);

// Import Matrix
router.get('/import/matrix-status', getImportMatrixStatus);
router.post('/import/audit-scan', triggerAuditScan);
router.post('/import/league/:id/deep-sync', triggerDeepSync);
router.post('/import/leagues/batch-deep-sync', triggerBatchDeepSync);
router.post('/import/status/reset', resetImportStatus);
router.post('/import/stop', stopImport);
router.post('/import/pause', pauseImport);
router.post('/import/resume', resumeImport);
router.get('/import/state', getImportStateEndpoint);

// Discovery Flow
router.get('/import/discovery/countries', getDiscoveryCountries);
router.get('/import/discovery/leagues', getDiscoveryLeagues);
router.post('/import/discovery/import', triggerDiscoveryImport);

export default router;
