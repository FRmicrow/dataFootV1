import SimulationQueueService from '../../services/v3/SimulationQueueService.js';
import SimulationService from '../../services/v3/simulationService.js';
import logger from '../../utils/logger.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, status, error, details) => res.status(status).json({ success: false, error, ...(details ? { details } : {}) });

export const triggerSimulation = async (req, res) => {
    try {
        const { leagueId, seasonYear, mode, horizon } = req.body;

        // US_201: Pre-Flight Readiness Lock
        const readiness = await SimulationService.checkSimulationReadiness(Number.parseInt(leagueId), Number.parseInt(seasonYear));
        if (readiness.status !== 'READY') {
            return fail(res, 400, 'FORGE_DATA_VOID', readiness);
        }

        const result = await SimulationQueueService.startSimulation(
            leagueId,
            seasonYear,
            mode || 'STATIC',
            horizon || 'FULL_HISTORICAL'
        );
        return ok(res, result);
    } catch (err) {
        logger.error({ err }, 'Simulation trigger error');
        return fail(res, 500, err.message || 'Internal server error');
    }
};

export const triggerBulkSimulation = (req, res) => {
    try {
        const result = SimulationQueueService.startBulkRegen();
        const statusCode = result.success ? 200 : 410;
        if (result.success) {
            return ok(res, result, statusCode);
        }
        return fail(res, statusCode, result.message || 'Bulk simulation unavailable', result);
    } catch (err) {
        logger.error({ err }, 'Bulk simulation trigger error');
        return fail(res, 500, 'Internal server error');
    }
};

export const checkBulkJobStatus = (req, res) => {
    try {
        return ok(res, { status: 'PENDING', message: 'Bulk status logic under construction.' });
    } catch (err) {
        logger.error({ err }, 'Bulk job check error');
        return fail(res, 500, 'Internal server error');
    }
};

export const checkJobStatus = async (req, res) => {
    try {
        const { leagueId, seasonYear, horizon, simId } = req.query;
        const status = await SimulationQueueService.getJobStatus(leagueId, seasonYear, horizon, simId);

        if (!status) {
            return ok(res, { status: 'NONE', message: 'No simulation has been run for this scope yet.' });
        }
        return ok(res, status);
    } catch (err) {
        logger.error({ err }, 'Simulation job check error');
        return fail(res, 500, 'Internal server error');
    }
};

export const getLeagueSimulations = async (req, res) => {
    try {
        const { leagueId } = req.params;
        const jobs = await SimulationQueueService.getAllSimulationsForLeague(leagueId);
        return ok(res, jobs);
    } catch (err) {
        logger.error({ err }, 'getLeagueSimulations error');
        return fail(res, 500, 'Internal server error');
    }
};

export const getAllJobs = async (req, res) => {
    try {
        const jobs = await SimulationQueueService.getAllJobs();
        return ok(res, jobs);
    } catch (err) {
        logger.error({ err }, 'getAllJobs error');
        return fail(res, 500, 'Internal server error');
    }
};

export const getSimulationResults = async (req, res) => {
    try {
        const { simId } = req.params;
        const results = await SimulationService.getSimulationResults(simId);
        return ok(res, results);
    } catch (err) {
        logger.error({ err }, 'getSimulationResults error');
        return fail(res, 500, 'Internal server error');
    }
};

export const checkSimulationReadiness = async (req, res) => {
    try {
        const { leagueId, seasonYear } = req.query;
        const readiness = await SimulationService.checkSimulationReadiness(Number.parseInt(leagueId), Number.parseInt(seasonYear));
        return ok(res, readiness);
    } catch (err) {
        logger.error({ err }, 'checkSimulationReadiness error');
        return fail(res, 500, 'Internal server error');
    }
};
