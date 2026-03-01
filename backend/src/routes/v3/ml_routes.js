import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    mlTrainSchema,
    leagueIdV3ParamSchema,
    simulationStatusSchema,
    breedingSchema,
    breedingStatusSchema
} from '../../schemas/v3Schemas.js';
import {
    triggerModelRetrain,
    getModelStatus,
    buildForgeModels,
    getForgeBuildStatus,
    cancelForgeBuild,
    getForgeModels,
    retrainModel,
    getRetrainStatus,
    getEligibleHorizons,
    getLeagueModels
} from '../../controllers/v3/mlController.js';
import {
    triggerSimulation,
    checkJobStatus,
    getSimulationResults,
    checkSimulationReadiness,
    triggerBulkSimulation,
    checkBulkJobStatus,
    getLeagueSimulations
} from '../../controllers/v3/simulationController.js';
import { startBreeding, getBreedingStatus } from '../../controllers/v3/forgeLaboratoryController.js';

const router = express.Router();

// ML Management
router.post('/ml/train', validateRequest(mlTrainSchema), triggerModelRetrain);
router.get('/ml/status', getModelStatus);
router.post('/forge/build-models', buildForgeModels);
router.get('/forge/build-status', getForgeBuildStatus);
router.post('/forge/cancel-build', cancelForgeBuild);
router.get('/forge/models', getForgeModels);
router.post('/forge/retrain', retrainModel);
router.get('/forge/retrain-status', getRetrainStatus);
router.get('/forge/eligible-horizons', getEligibleHorizons);
router.get('/forge/league-models/:leagueId', validateRequest(leagueIdV3ParamSchema), getLeagueModels);

// Forge Laboratory
router.post('/forge/breed', validateRequest(breedingSchema), startBreeding);
router.get('/forge/breed-status', validateRequest(breedingStatusSchema), getBreedingStatus);

// Simulation Engine
router.post('/simulation/start', triggerSimulation);
router.get('/simulation/status', validateRequest(simulationStatusSchema), checkJobStatus);
router.get('/simulation/readiness', checkSimulationReadiness);
router.get('/simulation/results/:simId', getSimulationResults);
router.get('/simulation/league/:leagueId', getLeagueSimulations);
router.post('/simulation/bulk', triggerBulkSimulation);
router.get('/simulation/bulk/status', checkBulkJobStatus);

export default router;
