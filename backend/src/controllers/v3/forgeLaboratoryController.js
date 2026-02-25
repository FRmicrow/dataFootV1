
import ForgeLaboratoryService from '../../services/v3/ForgeLaboratoryService.js';

export const startBreeding = async (req, res) => {
    try {
        const { leagueId } = req.body;
        if (!leagueId) return res.status(400).json({ error: 'Missing leagueId' });

        const result = await ForgeLaboratoryService.startBreedingCycle(parseInt(leagueId));
        if (!result.success) return res.status(400).json(result);

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getBreedingStatus = (req, res) => {
    try {
        const { leagueId } = req.query;
        if (!leagueId) return res.status(400).json({ error: 'Missing leagueId' });

        const status = ForgeLaboratoryService.getCycleStatus(parseInt(leagueId));
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
