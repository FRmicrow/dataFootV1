import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    healthFixSchema,
    healthFixAllSchema,
    healthRevertSchema,
    healthCheckLeagueSchema,
    healthCheckDeepSchema,
    preferencesSchema
} from '../../schemas/v3Schemas.js';
import {
    getDbHealth,
    fixDbHealth,
    getLeagueNames,
    checkLeagueHealthName,
    revertCleanup,
    checkDeepHealth,
    fixAllIssues,
    getCleanupHistory
} from '../../controllers/v3/adminController.js';
import {
    getPreferences,
    updatePreferences
} from '../../controllers/v3/preferencesController.js';

const router = express.Router();

// Admin
router.get('/admin/health', getDbHealth);
router.post('/admin/health/fix', validateRequest(healthFixSchema), fixDbHealth);
router.post('/admin/health/fix-all', validateRequest(healthFixAllSchema), fixAllIssues);
router.get('/admin/health/history', getCleanupHistory);
router.post('/admin/health/revert/:groupId', validateRequest(healthRevertSchema), revertCleanup);
router.post('/admin/health/revert/id/:groupId', validateRequest(healthRevertSchema), revertCleanup);
router.get('/admin/health/leagues', getLeagueNames);
router.post('/admin/health/check-league', validateRequest(healthCheckLeagueSchema), checkLeagueHealthName);
router.post('/admin/health/check-deep', validateRequest(healthCheckDeepSchema), checkDeepHealth);

// Preferences
router.get('/preferences', getPreferences);
router.put('/preferences', validateRequest(preferencesSchema), updatePreferences);

export default router;
