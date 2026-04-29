import SearchServiceV4 from '../../services/v4/SearchServiceV4.js';
import logger from '../../utils/logger.js';

/**
 * US-441: V4 Global Search API
 */
export const searchV4 = async (req, res) => {
    try {
        const { q: query, type = 'all', limit = 20 } = req.query;

        if (!query || query.length < 2) {
            return res.json({ 
                success: true, 
                data: {
                    competitions: [],
                    teams: [],
                    people: []
                } 
            });
        }

        const results = await SearchServiceV4.globalSearch(query, { type, limit: parseInt(limit) });
        res.json({ success: true, data: results });

    } catch (error) {
        logger.error({ err: error, query: req.query?.q }, 'V4 Search Error');
        res.status(500).json({ success: false, message: 'Search failed' });
    }
};

export const getSearchCountriesV4 = async (req, res) => {
    try {
        const rows = await SearchServiceV4.getSearchCountries();
        res.json({ success: true, data: rows });
    } catch (error) {
        logger.error({ err: error }, 'V4 Get Countries Error');
        res.status(500).json({ success: false, message: error.message });
    }
};
