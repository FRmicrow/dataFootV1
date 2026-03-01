import LeagueRepository from '../../repositories/v3/LeagueRepository.js';
import DashboardRepository from '../../repositories/v3/DashboardRepository.js';
import { HealthIntelligenceService } from '../../services/v3/HealthIntelligenceService.js';

/**
 * V3 Dashboard Controller
 * Provides high-level stats about V3 data.
 */

export const getV3Stats = async (req, res) => {
    try {
        const volumetrics = DashboardRepository.getVolumetrics();
        const distribution = DashboardRepository.getContinentalDistribution();
        const players_by_country = DashboardRepository.getTopPlayerNationalities(10);
        const fixture_trends = DashboardRepository.getFixtureTrends();

        // Health Intelligence Score (US_113)
        const health = HealthIntelligenceService.calculateScore();

        res.json({
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
        });
    } catch (error) {
        console.error("Error fetching V3 Intelligence Hub stats:", error);
        res.status(500).json({ error: "Failed to fetch aggregated intelligence" });
    }
};

/**
 * Get list of fully imported leagues (for Navigation)
 */
export const getImportedLeagues = async (req, res) => {
    try {
        const rows = LeagueRepository.getImportedLeaguesData();

        const leagues = rows.map(row => ({
            league_id: row.league_id,
            api_id: row.api_id,
            name: row.name,
            league_type: row.league_type || 'League',
            logo_url: row.logo_url,
            country_name: row.country_name,
            country_rank: row.importance_rank || 999,
            flag_url: row.flag_url,
            years_imported: row.years_csv ? [...new Set(row.years_csv.split(','))].map(y => parseInt(y)).sort((a, b) => b - a) : []
        }));

        res.json(leagues);
    } catch (error) {
        console.error("Error fetching imported leagues:", error);
        res.status(500).json({ error: "Failed to fetch imported leagues" });
    }
};

/**
 * Get list of auto-discovered leagues waiting for full import
 */
export const getDiscoveredLeagues = async (req, res) => {
    try {
        const rows = LeagueRepository.getDiscoveredLeaguesData();

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
                seasons: row.years_csv ? [...new Set(row.years_csv.split(','))].map(y => parseInt(y)).sort((a, b) => b - a) : []
            });
        });

        res.json(Object.values(byCountry).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
        console.error("Error fetching discovered leagues:", error);
        res.status(500).json({ error: "Failed to fetch discovered leagues" });
    }
};
