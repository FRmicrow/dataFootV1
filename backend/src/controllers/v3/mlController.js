import mlService from '../../services/v3/mlService.js';

export const triggerModelRetrain = async (req, res) => {
    try {
        const result = await mlService.triggerRetraining();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getModelStatus = async (req, res) => {
    try {
        const status = await mlService.getTrainingStatus();
        // Merge ML service health check
        res.json({ success: true, data: { ...status, status: 'online' } });
    } catch (err) {
        res.status(500).json({ success: true, data: { status: 'offline', is_training: false } });
    }
};

/**
 * Forge Model Building (V8)
 */
export const buildForgeModels = async (req, res) => {
    try {
        const { leagueId, seasonYear } = req.body;
        if (!leagueId) {
            return res.status(400).json({ success: false, message: 'Missing leagueId' });
        }
        const result = await mlService.buildForgeModels(leagueId, seasonYear);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getForgeBuildStatus = async (req, res) => {
    try {
        const status = await mlService.getForgeBuildStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ is_building: false, error: err.message });
    }
};

export const cancelForgeBuild = async (req, res) => {
    try {
        const result = await mlService.cancelForgeBuild();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getForgeModels = async (req, res) => {
    try {
        const result = await mlService.getForgeModels();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, models: [] });
    }
};

/**
 * Adaptive Model Refinement (V8)
 */
export const retrainModel = async (req, res) => {
    try {
        const { modelId, simulationId } = req.body;
        if (!modelId || !simulationId) {
            return res.status(400).json({ success: false, message: 'Missing modelId or simulationId' });
        }
        const result = await mlService.retrainFromSimulation(modelId, simulationId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getRetrainStatus = async (req, res) => {
    try {
        const status = await mlService.getRetrainStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ is_retraining: false, error: err.message });
    }
};

export const getEligibleHorizons = async (req, res) => {
    try {
        const { leagueId, seasonYear } = req.query;
        if (!leagueId || !seasonYear) {
            return res.status(400).json({ success: false, message: 'Missing leagueId or seasonYear' });
        }
        const result = await mlService.getEligibleHorizons(leagueId, seasonYear);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, eligible: ['FULL_HISTORICAL'] });
    }
};

export const getLeagueModels = async (req, res) => {
    try {
        const { leagueId } = req.params;
        if (!leagueId) {
            return res.status(400).json({ success: false, message: 'Missing leagueId' });
        }
        const result = await mlService.getLeagueModels(leagueId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, models: [], has_models: false });
    }
};

export default {
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
};
