import SimulationService from '../../services/v3/simulationService.js';

export const getBacktest = async (req, res) => {
    try {
        const { leagueId, minEdge, minConfidence, dateStart, dateEnd, pick } = req.query;

        const results = SimulationService.runBacktest({
            leagueId: leagueId ? Number.parseInt(leagueId) : null,
            minEdge: minEdge ? Number.parseFloat(minEdge) : 3.0,
            minConfidence: minConfidence ? Number.parseInt(minConfidence) : 60,
            dateRange: (dateStart && dateEnd) ? [dateStart, dateEnd] : null,
            pickFilter: pick
        });

        res.json({ success: true, data: results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getCalibrationAudit = async (req, res) => {
    try {
        const { leagueId } = req.query;
        const results = SimulationService.runCalibrationAudit(leagueId ? Number.parseInt(leagueId) : null);
        res.json({ success: true, data: results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export default {
    getBacktest,
    getCalibrationAudit
};
