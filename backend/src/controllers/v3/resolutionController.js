import { ResolutionService } from '../../services/v3/ResolutionService.js';

/**
 * Resolution Controller
 * Handles entity deduplication and merging.
 */

export const getPotentialDuplicates = async (req, res) => {
    try {
        const { threshold = 85 } = req.query;
        const duplicates = ResolutionService.findGlobalDuplicates(Number.parseInt(threshold));
        res.json(duplicates);
    } catch (error) {
        console.error("Error finding duplicates:", error);
        res.status(500).json({ error: "Failed to scan for duplicates" });
    }
};

export const mergePlayers = async (req, res) => {
    try {
        const { id1, id2, confidence } = req.body;

        if (!id1 || !id2) {
            return res.status(400).json({ error: "Missing player IDs (id1, id2)" });
        }

        // If confidence wasn't provided, calculate it
        if (confidence === undefined) {
            // Need to fetch players first if we want to confirm confidence again
        }

        const result = ResolutionService.performMerge(id1, id2);
        res.json({
            message: "Merge successful",
            ...result
        });
    } catch (error) {
        console.error("Merge execution error:", error);
        res.status(500).json({ error: error.message });
    }
};
