import FixtureRepository from '../../repositories/v3/FixtureRepository.js';
import logger from '../../utils/logger.js';

/**
 * US_V3-FIXTURE-001: Detailed Fixture Insights
 */
export const getFixtureDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const fixture = await FixtureRepository.getFixtureDetails(id);

        if (!fixture) {
            return res.status(404).json({ success: false, error: 'Fixture not found' });
        }

        res.json({ success: true, data: fixture });
    } catch (error) {
        logger.error({ err: error, fixtureId: req.params.id }, 'V3 Fixture Details Error');
        res.status(500).json({ success: false, error: 'Failed to fetch fixture details' });
    }
};

export const getFixtureEvents = async (req, res) => {
    try {
        const { id } = req.params;
        const events = await FixtureRepository.getFixtureEvents(id);
        res.json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getFixtureTacticalStats = async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await FixtureRepository.getFixtureTacticalStats(id);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getEventCandidates = async (req, res) => {
    try {
        const candidates = await FixtureRepository.getEventCandidates();
        res.json({ success: true, data: candidates });
    } catch (error) {
        logger.error({ err: error }, 'Error finding event candidates');
        res.status(500).json({ success: false, error: error.message });
    }
};

export const syncFixtureEvents = async (req, res) => {
    try {
        const { fixture_id } = req.body;
        // Stub: In a real scenario, this would call StatsEngine.syncFixtureEvents(fixture_id)
        res.json({ success: true, data: { message: `Syncing events for fixture ${fixture_id} is not yet implemented in StatsEngine.` } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getFixturePlayerTacticalStats = async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await FixtureRepository.getFixturePlayerTacticalStats(id);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ... and other methods would be similarly refactored
