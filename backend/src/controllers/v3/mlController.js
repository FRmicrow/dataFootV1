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
        res.json({ success: true, data: status });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export default {
    triggerModelRetrain,
    getModelStatus
};
