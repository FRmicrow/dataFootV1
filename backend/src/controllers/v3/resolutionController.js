import { ResolutionService } from '../../services/v3/ResolutionService.js';
import logger from '../../utils/logger.js';

/**
 * Resolution Controller
 * Handles entity deduplication and merging.
 */

export const getPotentialDuplicates = async (req, res) => {
    try {
        const { threshold = 85 } = req.query;
        const duplicates = await ResolutionService.findGlobalDuplicates(Number.parseInt(threshold));
        res.json({ success: true, data: duplicates });
    } catch (error) {
        logger.error({ err: error }, 'Error finding duplicates');
        res.status(500).json({ success: false, error: "Failed to scan for duplicates" });
    }
};

export const mergePlayers = async (req, res) => {
    try {
        const { id1, id2, confidence } = req.body;

        if (!id1 || !id2) {
            return res.status(400).json({ success: false, error: "Missing player IDs (id1, id2)" });
        }

        if (Number(id1) === Number(id2)) {
            return res.status(400).json({ success: false, error: "Cannot merge the same player record" });
        }

        // If confidence wasn't provided, calculate it
        if (confidence === undefined) {
            // Need to fetch players first if we want to confirm confidence again
        }

        const result = await ResolutionService.performMerge(id1, id2);
        res.json({
            success: true,
            data: {
                message: "Merge successful",
                ...result
            }
        });
    } catch (error) {
        logger.error({ err: error, id1: req.body.id1, id2: req.body.id2 }, 'Merge execution error');
        res.status(500).json({ success: false, error: error.message });
    }
};
