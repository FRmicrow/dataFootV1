import { ingestMultiMarketOdds, bulkIngestOddsByDate } from '../../services/v3/bulkOddsService.js';

/**
 * Controller for Bulk Odds Operations (US_140)
 */

export const triggerFixtureDepthIngestion = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await ingestMultiMarketOdds(id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const triggerDateBulkIngestion = async (req, res) => {
    const { date } = req.body;
    if (!date) {
        return res.status(400).json({ error: 'Date is required' });
    }

    try {
        const result = await bulkIngestOddsByDate(date);
        res.json({
            message: `Bulk ingestion completed for ${date}`,
            result
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
