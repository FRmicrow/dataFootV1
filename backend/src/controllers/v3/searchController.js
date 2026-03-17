import SearchRepository from '../../repositories/v3/SearchRepository.js';
import logger from '../../utils/logger.js';

/**
 * US_V3-SEARCH-001: Global High-Performance Search
 */
export const searchV3 = async (req, res) => {
    try {
        const { q: query } = req.query;
        if (!query || query.length < 2) {
            return res.json({ success: true, data: [] });
        }

        const results = await SearchRepository.globalSearch(query, 50);
        res.json({ success: true, data: results });

    } catch (error) {
        logger.error({ err: error, query: req.query?.q }, 'V3 Search Error');
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};

export const getSearchCountries = async (req, res) => {
    try {
        const rows = await SearchRepository.getSearchCountries();
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
