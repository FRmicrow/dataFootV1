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

const legacyForgeDisabled = (message = 'Legacy Forge pipeline removed. Use the PostgreSQL-only training and simulation stack.') => ({
    success: false,
    disabled: true,
    message,
});

export const buildForgeModels = async (leagueId, seasonYear = null) => {
    return legacyForgeDisabled();
};

export const getForgeBuildStatus = async () => {
    return { is_building: false, disabled: true, error: 'Legacy Forge pipeline removed.' };
};

export const cancelForgeBuild = async () => {
    return legacyForgeDisabled();
};

export const getForgeModels = async () => {
    return { success: false, disabled: true, models: [], message: 'Legacy Forge pipeline removed.' };
};

export const retrainFromSimulation = async (modelId, simulationId) => {
    return legacyForgeDisabled();
};

export const getRetrainStatus = async () => {
    return { is_retraining: false, disabled: true, error: 'Legacy Forge pipeline removed.' };
};

export const getEligibleHorizons = async (leagueId, seasonYear) => {
    return legacyForgeDisabled();
};

export const getLeagueModels = async (leagueId) => {
    return { success: false, disabled: true, models: [], has_models: false, message: 'Legacy Forge pipeline removed.' };
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
