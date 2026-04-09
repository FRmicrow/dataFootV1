import LeagueRepository from '../../repositories/v3/LeagueRepository.js';
import DashboardRepository from '../../repositories/v3/DashboardRepository.js';
import { HealthIntelligenceService } from '../../services/v3/HealthIntelligenceService.js';
import logger from '../../utils/logger.js';

/**
 * V3 Dashboard Controller
 * Provides high-level stats about V3 data.
 */

export const getV3Stats = async (req, res) => {
    try {
        const [volumetrics, distribution, players_by_country, fixture_trends] = await Promise.all([
            DashboardRepository.getVolumetrics(),
            DashboardRepository.getContinentalDistribution(),
            DashboardRepository.getTopPlayerNationalities(10),
            DashboardRepository.getFixtureTrends()
        ]);

        // Health Intelligence Score (US_113)
        // Assume this might be sync or needs refactor later, leaving as is if not part of previous refactor
        const health = await HealthIntelligenceService.calculateScore();

        res.json({
            success: true,
            data: {
                volumetrics,
                distribution,
                players_by_country,
                fixture_trends,
                health_summary: {
                    score: health.score,
                    coverage_percent: health.coverage_percent,
                    orphans: health.details.orphans,
                    partial_seasons: health.details.missing_fixture_seasons
                }
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching V3 Intelligence Hub stats');
        res.status(500).json({ success: false, error: "Failed to fetch aggregated intelligence" });
    }
};

/**
 * Get list of fully imported leagues (for Navigation)
 */
export const getImportedLeagues = async (req, res) => {
    try {
        const rows = await LeagueRepository.getImportedLeaguesData();

        const leagues = rows.map(row => ({
            league_id: row.league_id,
            api_id: row.api_id,
            name: row.name,
            league_type: row.league_type || 'League',
            logo_url: row.logo_url,
            country_name: row.country_name,
            country_rank: row.importance_rank || 999,
            flag_url: row.flag_url,
            years_imported: row.years_csv ? [...new Set(row.years_csv.split(','))].map(y => Number.parseInt(y)).sort((a, b) => b - a) : []
        }));

        res.json({ success: true, data: leagues });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching imported leagues');
        res.status(500).json({ success: false, message: "Failed to fetch imported leagues" });
    }
};

/**
 * Get list of auto-discovered leagues waiting for full import
 */
export const getDiscoveredLeagues = async (req, res) => {
    try {
        const rows = await LeagueRepository.getDiscoveredLeaguesData();

        // Group by country for cleaner frontend
        const byCountry = {};
        rows.forEach(row => {
            const country = row.country_name || 'World';
            if (!byCountry[country]) {
                byCountry[country] = {
                    name: country,
                    flag: row.flag_url,
                    leagues: []
                };
            }
            byCountry[country].leagues.push({
                league_id: row.league_id,
                api_id: row.api_id,
                name: row.name,
                logo_url: row.logo_url,
                seasons: row.years_csv ? [...new Set(row.years_csv.split(','))].map(y => Number.parseInt(y)).sort((a, b) => b - a) : []
            });
        });

        res.json({
            success: true,
            data: Object.values(byCountry).sort((a, b) => a.name.localeCompare(b.name))
        });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching discovered leagues');
        res.status(500).json({ success: false, message: "Failed to fetch discovered leagues" });
    }
};
