import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    preferencesSchema
} from '../../schemas/v3Schemas.js';
import {
    getPreferences,
    updatePreferences
} from '../../controllers/v3/preferencesController.js';

const router = express.Router();

// Preferences
router.get('/preferences', getPreferences);
router.put('/preferences', validateRequest(preferencesSchema), updatePreferences);

export default router;
