import SearchRepository from '../../repositories/v3/SearchRepository.js';

/**
 * US_V3-SEARCH-001: Global High-Performance Search
 */
export const searchV3 = async (req, res) => {
    try {
        const { q: query } = req.query;
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const results = await SearchRepository.globalSearch(query, 50);
        res.json(results);

    } catch (error) {
        console.error('V3 Search Error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};

export const getSearchCountries = async (req, res) => {
    try {
        const rows = await SearchRepository.getSearchCountries();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
