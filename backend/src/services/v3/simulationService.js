import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

/**
 * Simulation & Backtesting Service (V8 - Accuracy Only, No Odds)
 * Provides readiness checks and results retrieval for the Forge Engine.
 */
export class SimulationService {

    /**
     * US_201: Pre-Flight Readiness Check
     * Validates that a league/season has enough data to run a simulation.
     */
    static async checkSimulationReadiness(leagueId, seasonYear) {
        try {
            const totalFixtures = await this.#getFixtureCount(leagueId, seasonYear);

            if (totalFixtures === 0) {
                return {
                    status: 'BLOCKED',
                    total_fixtures: 0,
                    message: `No completed fixtures found for this league/season. Import data first.`
                };
            }

            const totalFeatures = await this.#getFeatureCount(leagueId, seasonYear);
            const featureCoverage = (totalFeatures / totalFixtures) * 100;
            const modelExists = await this.#getActiveModel(leagueId);

            if (totalFixtures < 30) {
                return {
                    status: 'PARTIAL',
                    total_fixtures: totalFixtures,
                    feature_coverage: featureCoverage.toFixed(1),
                    has_model: !!modelExists,
                    message: `Only ${totalFixtures} fixtures available. Need at least 30 for reliable simulation.`
                };
            }

            return {
                status: 'READY',
                total_fixtures: totalFixtures,
                feature_coverage: featureCoverage.toFixed(1),
                has_model: !!modelExists,
                model_accuracy: modelExists?.accuracy ? (modelExists.accuracy * 100).toFixed(1) + '%' : null,
                message: `${totalFixtures} fixtures ready. System is cleared for simulation.`
            };

        } catch (err) {
            console.error('checkSimulationReadiness error:', err);
            return {
                status: 'BLOCKED',
                total_fixtures: 0,
                message: 'Internal error checking readiness.'
            };
        }
    }

    static async #getFixtureCount(leagueId, seasonYear) {
        const res = await db.get(`
            SELECT COUNT(*) as count 
            FROM V3_Fixtures 
            WHERE league_id = ? AND season_year = ? 
              AND status_short IN ('FT', 'AET', 'PEN')
        `, cleanParams([leagueId, seasonYear]));
        return res?.count || 0;
    }

    static async #getFeatureCount(leagueId, seasonYear) {
        const res = await db.get(`
            SELECT COUNT(*) as count 
            FROM V3_ML_Feature_Store fs
            JOIN V3_Fixtures f ON fs.fixture_id = f.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
              AND f.status_short IN ('FT', 'AET', 'PEN')
        `, cleanParams([leagueId, seasonYear]));
        return res?.count || 0;
    }

    static async #getActiveModel(leagueId) {
        return await db.get(`
            SELECT id, accuracy, horizon_type, trained_at
            FROM V3_Model_Registry
            WHERE (league_id = ? OR league_id IS NULL) AND is_active = 1
            ORDER BY league_id DESC, id DESC LIMIT 1
        `, cleanParams([leagueId]));
    }

    /**
     * Get Simulation Results (Match-level predictions vs actuals)
     */
    static async getSimulationResults(simId) {
        try {
            const results = await db.all(`
                SELECT 
                    r.fixture_id, r.prob_home, r.prob_draw, r.prob_away,
                    r.predicted_score, r.actual_winner, r.is_correct,
                    f.round as round_name,
                    f.goals_home, f.goals_away,
                    ht.name as home_team_name,
                    at.name as away_team_name
                FROM V3_Forge_Results r
                JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
                LEFT JOIN V3_Teams ht ON f.home_team_id = ht.api_id
                LEFT JOIN V3_Teams at ON f.away_team_id = at.api_id
                WHERE r.simulation_id = ?
                ORDER BY f.date ASC, f.fixture_id ASC
            `, cleanParams([simId]));

            return results.map(r => {
                const mapResult = (val) => {
                    if (val === null) return '-';
                    return ['X', '1', '2'][val === 1 ? 1 : (val === 2 ? 2 : 0)];
                };

                return {
                    fixture_id: r.fixture_id,
                    round_name: r.round_name,
                    home_team_name: r.home_team_name || 'Home',
                    away_team_name: r.away_team_name || 'Away',
                    prob_home: r.prob_home ? (r.prob_home * 100).toFixed(1) + '%' : '-',
                    prob_draw: r.prob_draw ? (r.prob_draw * 100).toFixed(1) + '%' : '-',
                    prob_away: r.prob_away ? (r.prob_away * 100).toFixed(1) + '%' : '-',
                    score: r.goals_home !== null ? `${r.goals_home}-${r.goals_away}` : '-',
                    predicted_outcome: mapResult(r.actual_winner), // FIXME: should be predicted_winner if column exists
                    actual_result: mapResult(r.actual_winner),
                    is_correct: r.is_correct
                };
            });

        } catch (err) {
            console.error('getSimulationResults error:', err);
            return [];
        }
    }
}

export default SimulationService;
