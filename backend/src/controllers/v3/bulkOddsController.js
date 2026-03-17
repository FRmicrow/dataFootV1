import { ingestMultiMarketOdds, bulkIngestOddsByDate } from '../../services/v3/bulkOddsService.js';
import logger from '../../utils/logger.js';

/**
 * Controller for Bulk Odds Operations (US_140)
 */

export const triggerFixtureDepthIngestion = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await ingestMultiMarketOdds(id);
        res.json({ success: true, data: result });
    } catch (err) {
        logger.error({ err, fixtureId: id }, 'Bulk odds fixture ingestion failed');
        res.status(500).json({ success: false, error: err.message });
    }
};

export const triggerDateBulkIngestion = async (req, res) => {
    const { date } = req.body;
    if (!date) {
        return res.status(400).json({ success: false, error: 'Date is required' });
    }

    try {
        const result = await bulkIngestOddsByDate(date);
        res.json({
            success: true,
            data: {
                message: `Bulk ingestion completed for ${date}`,
                result
            }
        });
    } catch (err) {
        logger.error({ err, date }, 'Bulk odds date ingestion failed');
        res.status(500).json({ success: false, error: err.message });
    }
};
