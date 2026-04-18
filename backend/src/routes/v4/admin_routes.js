import express from 'express';
import AdminServiceV4 from '../../services/v4/AdminServiceV4.js';
import logger from '../../utils/logger.js';
import { requireAdminKey } from '../../middleware/requireAdminKey.js';

const router = express.Router();

// @CRITICAL: All routes require X-Admin-Key header for security
router.use(requireAdminKey);

/**
 * POST /api/v4/admin/maintenance/deduplicate
 * Triggers the systemic deduplication of v4.people
 * ⚠️ WARNING: Destructive operation (merges duplicate records)
 * Protected by requireAdminKey middleware
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
