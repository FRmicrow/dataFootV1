import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    mlTrainSchema,
    leagueIdV3ParamSchema,
    simulationStatusSchema
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
    getLeagueModels,
    getMLOrchestratorStatus,
    getMLRecentAnalyses,
    getMLModelEvaluation,
    getMLSimulationOverview,
    getMLRecommendations,
    syncUpcomingOdds,
    syncAdvancedOdds,
    runOddsCatchup,
    predictFixtureAll,
    getMLClubEvaluation,
    getUpcomingPredictions
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

// Machine Learning Platform V19
router.get('/ml-platform/orchestrator/status', getMLOrchestratorStatus);
router.get('/ml-platform/risk/recent', getMLRecentAnalyses);
router.get('/ml-platform/simulations/evaluation', getMLModelEvaluation);
router.get('/ml-platform/simulations/overview', getMLSimulationOverview);
router.get('/ml-platform/simulations/club-evaluation', getMLClubEvaluation);
router.get('/ml-platform/predictions/upcoming', getUpcomingPredictions);
router.get('/ml-platform/recommendations', getMLRecommendations);
router.post('/ml-platform/odds/sync', syncUpcomingOdds);
router.post('/ml-platform/odds/advanced-sync', syncAdvancedOdds);
router.post('/ml-platform/odds/catchup', runOddsCatchup);
router.get('/predict/fixture/:id', predictFixtureAll);

// Simulation Engine
router.post('/simulation/start', triggerSimulation);
router.get('/simulation/status', validateRequest(simulationStatusSchema), checkJobStatus);
router.get('/simulation/readiness', checkSimulationReadiness);
router.get('/simulation/results/:simId', getSimulationResults);
router.get('/simulation/league/:leagueId', getLeagueSimulations);
router.post('/simulation/bulk', triggerBulkSimulation);
router.get('/simulation/bulk/status', checkBulkJobStatus);

export default router;
