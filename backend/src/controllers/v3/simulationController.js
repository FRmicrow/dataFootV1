import SimulationQueueService from '../../services/v3/SimulationQueueService.js';
import SimulationService from '../../services/v3/simulationService.js';

export const triggerSimulation = (req, res) => {
    try {
        const { leagueId, seasonYear, mode, horizon } = req.body;

        if (!leagueId || !seasonYear) {
            return res.status(400).json({ error: 'Missing required parameters: leagueId, seasonYear' });
        }

        // US_201: Pre-Flight Readiness Lock
        const readiness = SimulationService.checkSimulationReadiness(parseInt(leagueId), parseInt(seasonYear));
        if (readiness.status !== 'READY') {
            return res.status(400).json({
                error: 'FORGE_DATA_VOID',
                message: readiness.message,
                details: readiness
            });
        }

        const result = SimulationQueueService.startSimulation(leagueId, seasonYear, mode || 'STATIC', horizon || 'FULL_HISTORICAL');
        res.json({ success: true, message: result.message });
    } catch (err) {
        console.error('Simulation trigger error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
};

export const triggerBulkSimulation = (req, res) => {
    try {
        const result = SimulationQueueService.startBulkRegen();
        res.json({ success: true, message: result.message });
    } catch (err) {
        console.error('Bulk simulation trigger error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const checkBulkJobStatus = (req, res) => {
    try {
        // Implementation for bulk status will be added in US_206
        res.json({ status: 'PENDING', message: 'Bulk status logic under construction.' });
    } catch (err) {
        console.error('Bulk job check error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const checkJobStatus = (req, res) => {
    try {
        const { leagueId, seasonYear } = req.query;
        if (!leagueId || !seasonYear) {
            return res.status(400).json({ error: 'Missing leagueId or seasonYear query params' });
        }

        const status = SimulationQueueService.getJobStatus(leagueId, seasonYear);

        if (!status) {
            return res.status(404).json({ success: false, message: 'No job found for this scope' });
        }
        res.json(status);
    } catch (err) {
        console.error('Job check error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAllJobs = (req, res) => {
    try {
        const jobs = SimulationQueueService.getAllJobs();
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getSimulationResults = (req, res) => {
    try {
        const { simId } = req.params;
        if (!simId) return res.status(400).json({ error: 'Missing simId' });

        const results = SimulationService.getSimulationResults(simId);

        res.json(results);
    } catch (err) {
        console.error('getSimulationResults error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const checkSimulationReadiness = (req, res) => {
    try {
        const { leagueId, seasonYear } = req.query;
        if (!leagueId || !seasonYear) {
            return res.status(400).json({ error: 'Missing leagueId or seasonYear' });
        }

        const readiness = SimulationService.checkSimulationReadiness(parseInt(leagueId), parseInt(seasonYear));
        res.json(readiness);
    } catch (err) {
        console.error('checkSimulationReadiness error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
