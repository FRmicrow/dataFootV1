import axios from 'axios';
import logger from '../../utils/logger.js';

/**
 * ML Service Integration (US_154)
 * Bridges the Node.js backend with the Python-based FastAPI predictive engine.
 */
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8008';

/**
 * Fallback Heuristic (Poisson-based approximation)
 * Used if the ML Service is unreachable (AC 2)
 */
const calculateHeuristicPrediction = (fixtureId) => {
    logger.info(`📡 [US_154] ML Service unreachable. Falling back to Heuristic for ${fixtureId}...`);
    // Simple 1X2 baseline: 45% Home, 25% Draw, 30% Away
    return {
        success: true,
        fixture_id: fixtureId,
        probabilities: {
            home: 0.4500,
            draw: 0.2500,
            away: 0.3000
        },
        fallback: true,
        reason: "ML Service Offline"
    };
};

export const getPredictionForFixture = async (fixtureId) => {
    try {
        logger.info(`🤖 [US_154] Requesting ML prediction from FastAPI for fixture ${fixtureId}...`);

        const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
            fixture_id: Number.parseInt(fixtureId)
        }, { timeout: 1000 }); // Fast timeout for responsiveness

        return response.data;
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
            return calculateHeuristicPrediction(fixtureId);
        }
        logger.error(`❌ ML Service API Error: ${err.message}`);
        return { success: false, reason: err.message };
    }
};

/**
 * Batch Prediction (US_154 Performance requirement)
 */
export const getBatchPredictions = async (fixtureIds) => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/batch_predict`, {
            fixture_ids: fixtureIds.map(id => Number.parseInt(id))
        });
        return response.data;
    } catch (err) {
        logger.warn(`⚠️ Batch prediction failed, returning empty set.`);
        return { success: false, results: [] };
    }
};

/**
 * Trigger Model Retraining (US_174)
 */
export const triggerRetraining = async () => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/train`);
        return response.data;
    } catch (err) {
        logger.error(`❌ ML Retraining Trigger Error: ${err.message}`);
        return { success: false, message: err.message };
    }
};

/**
 * Get Model Training Status (US_174)
 */
export const getTrainingStatus = async () => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/train/status`);
        return response.data;
    } catch (err) {
        return { success: false, is_training: false, error: "ML Service Offline" };
    }
};

/**
 * Forge Model Building (V8)
 */
export const buildForgeModels = async (leagueId, seasonYear = null) => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/forge/build-models`, {
            league_id: Number.parseInt(leagueId),
            season_year: seasonYear ? Number.parseInt(seasonYear) : null
        });
        return response.data;
    } catch (err) {
        logger.error(`❌ Forge Build Error: ${err.message}`);
        return { success: false, message: err.message };
    }
};

export const getForgeBuildStatus = async () => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/forge/build-status`);
        return response.data;
    } catch (err) {
        return { is_building: false, error: "ML Service Offline" };
    }
};

export const cancelForgeBuild = async () => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/forge/cancel-build`);
        return response.data;
    } catch (err) {
        return { success: false, message: "ML Service Offline" };
    }
};

export const getForgeModels = async () => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/forge/models`);
        return response.data;
    } catch (err) {
        return { success: false, models: [] };
    }
};

/**
 * Retrain model from simulation results (V8 Adaptive Refinement)
 */
export const retrainFromSimulation = async (modelId, simulationId) => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/forge/retrain`, {
            model_id: Number.parseInt(modelId),
            simulation_id: Number.parseInt(simulationId)
        }, { timeout: 300000 }); // 5min timeout for retraining
        return response.data;
    } catch (err) {
        logger.error(`❌ Retrain Error: ${err.message}`);
        return { success: false, message: err.message };
    }
};

export const getRetrainStatus = async () => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/forge/retrain-status`);
        return response.data;
    } catch (err) {
        return { is_retraining: false, error: "ML Service Offline" };
    }
};

export const getEligibleHorizons = async (leagueId, seasonYear) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/forge/eligible-horizons`, {
            params: {
                league_id: Number.parseInt(leagueId),
                season_year: Number.parseInt(seasonYear)
            }
        });
        return response.data;
    } catch (err) {
        return { success: false, eligible: ['FULL_HISTORICAL'] };
    }
};

export const getLeagueModels = async (leagueId) => {
    try {
        const sanitizedLeagueId = Number.parseInt(leagueId);
        const response = await axios.get(`${ML_SERVICE_URL}/forge/league-models/${sanitizedLeagueId}`);
        return response.data;
    } catch (err) {
        return { success: false, models: [], has_models: false };
    }
};

export const predictFixtureAll = async (fixtureId) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/predict/fixture/${fixtureId}`);
        return response.data;
    } catch (err) {
        logger.error(`❌ ML Master Prediction Error: ${err.message}`);
        return { success: false, message: err.message };
    }
};

export default {
    getPredictionForFixture,
    getBatchPredictions,
    triggerRetraining,
    getTrainingStatus,
    buildForgeModels,
    getForgeBuildStatus,
    cancelForgeBuild,
    getForgeModels,
    retrainFromSimulation,
    getRetrainStatus,
    getEligibleHorizons,
    getLeagueModels,
    predictFixtureAll
};
