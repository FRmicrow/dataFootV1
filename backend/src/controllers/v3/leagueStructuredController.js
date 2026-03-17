import LeagueRepository from '../../repositories/v3/LeagueRepository.js';
import logger from '../../utils/logger.js';

/**
 * US_070: High-Density League API & Ranking Aggregator
 * Delivers a structured hierarchy: International (Global/Continental) vs National (Domestic)
 */

const CACHE_KEY = 'v3_structured_leagues';
let cache = {
    data: null,
    timestamp: 0
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getStructuredLeagues = async (req, res) => {
    try {
        const now = Date.now();
        if (cache.data && (now - cache.timestamp < CACHE_TTL)) {
            return res.json({ success: true, data: cache.data });
        }

        // Fetch all leagues that have at least one imported season
        const rows = await LeagueRepository.getStructuredLeaguesData();


        const structured = {
            international: {
                club: {},        // Keyed by continent: Champions League, Europa League, Libertadores…
                national_team: {}// Keyed by continent/World: World Cup, Euro, Copa America…
            },
            national: [] // Domestic leagues grouped by country
        };

        const nationalMap = {};

        rows.forEach(row => {
            const isCup = row.league_type?.toLowerCase() === 'cup';

            const league = {
                id: row.league_id,
                api_id: row.api_id,
                name: row.league_name,
                type: row.league_type,
                logo: row.logo_url,
                rank: row.league_rank,
                is_cup: isCup,
                competition_type: row.competition_type,
                seasons_count: row.seasons_count,
                leader_name: isCup ? null : row.leader_name,
                leader_logo: isCup ? null : row.leader_logo,
                current_matchday: isCup ? null : row.current_matchday,
                current_round: isCup ? (row.next_round_name || row.last_round_name) : null
            };

            const isVirtual = row.country_name === row.continent;
            const isWorld = row.country_name === 'World';

            if (isVirtual || isWorld) {
                const bucket = row.competition_type === 'national_team'
                    ? structured.international.national_team
                    : structured.international.club;
                const key = isWorld ? 'World' : (row.continent || 'Other');
                if (!bucket[key]) bucket[key] = [];
                bucket[key].push(league);
            } else {
                // Domestic
                if (!nationalMap[row.country_name]) {
                    nationalMap[row.country_name] = {
                        name: row.country_name,
                        flag: row.flag_url,
                        rank: row.country_rank,
                        continent: row.continent,
                        leagues: []
                    };
                    structured.national.push(nationalMap[row.country_name]);
                }
                nationalMap[row.country_name].leagues.push(league);
            }
        });

        // Final sorting for national list (already sorted by SQL but let's be sure)
        structured.national.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

        cache = {
            data: structured,
            timestamp: now
        };

        res.json({ success: true, data: structured });

    } catch (error) {
        logger.error({ err: error }, 'Error in getStructuredLeagues');
        res.status(500).json({ success: false, message: "Failed to aggregate structured leagues" });
    }
};
