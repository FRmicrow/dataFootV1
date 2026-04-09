import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    duplicatesSchema,
    mergeSchema,
    prescriptionListSchema,
    prescriptionExecuteSchema
} from '../../schemas/v3Schemas.js';
import {
    getPotentialDuplicates,
    mergePlayers
} from '../../controllers/v3/resolutionController.js';
import {
    generatePrescriptions,
    getPrescriptions,
    executePrescription
} from '../../controllers/v3/healthController.js';
import {
    getBacktest,
    getCalibrationAudit
} from '../../controllers/v3/intelligenceController.js';

const router = express.Router();

// Entity Resolution
router.get('/resolution/duplicates', validateRequest(duplicatesSchema), getPotentialDuplicates);
router.post('/resolution/merge', validateRequest(mergeSchema), mergePlayers);

// Health Prescriptions
router.post('/health/prescribe', generatePrescriptions);
router.get('/health/prescriptions', validateRequest(prescriptionListSchema), getPrescriptions);
router.post('/health/execute', validateRequest(prescriptionExecuteSchema), executePrescription);

// Intelligence Hub
router.get('/intelligence/backtest', getBacktest);
router.get('/intelligence/audit', getCalibrationAudit);

export default router;
