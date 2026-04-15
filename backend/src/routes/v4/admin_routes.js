import express from 'express';
import AdminServiceV4 from '../../services/v4/AdminServiceV4.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * POST /api/v4/admin/maintenance/deduplicate
 * Triggers the systemic deduplication of v4.people
 * ⚠️ WARNING: Destructive operation (merges duplicate records)
 * In a real app, this should be protected by industrial-grade auth.
 */
router.post('/maintenance/deduplicate', async (req, res) => {
    try {
        const result = await AdminServiceV4.deduplicatePeople();
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error({ error }, 'Maintenance error at deduplication endpoint');
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v4/admin/maintenance/status
 * Returns the current status of maintenance tasks
 */
router.get('/maintenance/status', async (req, res) => {
    try {
        const result = await AdminServiceV4.getMaintenanceStatus();
        res.json({ success: true, ...result });
    } catch (error) {
        logger.error({ error }, 'Maintenance error at status endpoint');
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
