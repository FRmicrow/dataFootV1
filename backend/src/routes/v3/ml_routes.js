import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    mlTrainSchema,
    leagueIdV3ParamSchema,
    simulationStatusSchema,
    simulationStartSchema,
    simulationReadinessSchema,
    simulationIdParamSchema,
    roiRequestSchema,
    edgesTopQuerySchema,
    createSubmodelSchema
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
    getMLSimulationFilters,
    getMLModelEvaluation,
    getMLSimulationOverview,
    getMLRecommendations,
    syncUpcomingOdds,
    syncAdvancedOdds,
    runOddsCatchup,
    predictFixtureAll,
    getMLClubEvaluation,
    getUpcomingPredictions,
    getModelsCatalog,
    calculatePerformanceROI,
    getTopEdges,
    getSubmodels,
    createSubmodel,
    deleteSubmodel,
    getLeaguesWithOdds
} from '../../controllers/v3/mlController.js';
import {
    triggerSimulation,
    checkJobStatus,
    getSimulationResults,
    checkSimulationReadiness,
    triggerBulkSimulation,
    checkBulkJobStatus,
    getLeagueSimulations,
    getAllJobs
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
router.get('/ml-platform/simulations/filters', getMLSimulationFilters);
router.get('/ml-platform/simulations/evaluation', getMLModelEvaluation);
router.get('/ml-platform/simulations/overview', getMLSimulationOverview);
router.get('/ml-platform/simulations/club-evaluation', getMLClubEvaluation);
router.get('/ml-platform/predictions/upcoming', getUpcomingPredictions);
router.get('/ml-platform/recommendations', getMLRecommendations);
router.post('/ml-platform/odds/sync', syncUpcomingOdds);
router.post('/ml-platform/odds/advanced-sync', syncAdvancedOdds);
router.post('/ml-platform/odds/catchup', runOddsCatchup);
router.get('/predict/fixture/:id', predictFixtureAll);

// V37 ML Hub — New Endpoints
router.get('/ml-platform/models/catalog', getModelsCatalog);
router.post('/ml-platform/performance/roi', validateRequest(roiRequestSchema), calculatePerformanceROI);
router.get('/ml-platform/edges/top', validateRequest(edgesTopQuerySchema), getTopEdges);
router.get('/ml-platform/submodels', getSubmodels);
router.get('/ml-platform/performance/leagues-with-odds', getLeaguesWithOdds);
router.post('/ml-platform/submodels', validateRequest(createSubmodelSchema), createSubmodel);
router.delete('/ml-platform/submodels/:id', deleteSubmodel);

// Simulation Engine
router.post('/simulation/start', validateRequest(simulationStartSchema), triggerSimulation);
router.get('/simulation/status', validateRequest(simulationStatusSchema), checkJobStatus);
router.get('/simulation/readiness', validateRequest(simulationReadinessSchema), checkSimulationReadiness);
router.get('/simulation/results/:simId', validateRequest(simulationIdParamSchema), getSimulationResults);
router.get('/simulation/league/:leagueId', validateRequest(leagueIdV3ParamSchema), getLeagueSimulations);
router.get('/simulation/all', getAllJobs);
router.post('/simulation/bulk', triggerBulkSimulation);
router.get('/simulation/bulk/status', checkBulkJobStatus);

export default router;
