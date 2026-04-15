import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    getMatchPredictionSchema,
    getPredictionHistorySchema,
    predictV4MatchSchema,
    getV4ForesightCompetitionsSchema,
    getV4ForesightMatchesSchema
} from '../../schemas/v4Schemas.js';
import {
    getMatchPrediction,
    getPredictionHistory,
    predictV4Match,
    getV4ForesightCompetitions,
    getV4ForesightMatches,
    getV4MLStats
} from '../../controllers/v4/mlControllerV4.js';

const router = express.Router();

// GET /v4/match/:matchId/prediction
// Bridge: resolve V4 match → V3 fixture → stored ML prediction
router.get('/match/:matchId/prediction', validateRequest(getMatchPredictionSchema), getMatchPrediction);

// POST /v4/match/:matchId/predict
// Live inference: compute features from V4 tables → run ml-service → return probabilities
router.post('/match/:matchId/predict', validateRequest(predictV4MatchSchema), predictV4Match);

// GET /v4/ml/predictions/history
// Historical predictions with actual results (for perf tracking)
router.get('/ml/predictions/history', validateRequest(getPredictionHistorySchema), getPredictionHistory);

// GET /v4/ml/foresight/competitions
// List V4 competitions with upcoming matches (for the competition picker)
router.get('/ml/foresight/competitions', validateRequest(getV4ForesightCompetitionsSchema), getV4ForesightCompetitions);

// GET /v4/ml/foresight/competition/:competitionId
// Upcoming V4 matches with ML predictions
router.get('/ml/foresight/competition/:competitionId', validateRequest(getV4ForesightMatchesSchema), getV4ForesightMatches);

// GET /v4/ml/stats
// Aggregate stats for the ML hub MetricStrip (hit rate, coverage, total predictions)
router.get('/ml/stats', getV4MLStats);

export default router;
