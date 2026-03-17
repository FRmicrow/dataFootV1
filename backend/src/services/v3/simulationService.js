import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import logger from '../../utils/logger.js';

const parseMetadata = (value) => {
    if (!value) return {};
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
};

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
            const modelExists = await this.#getActiveModel();
            const accuracy = Number(modelExists?.metadata?.metrics?.accuracy);

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
                model_accuracy: Number.isFinite(accuracy) ? (accuracy * 100).toFixed(1) + '%' : null,
                message: `${totalFixtures} fixtures ready. System is cleared for simulation.`
            };

        } catch (err) {
            logger.error({ err, leagueId, seasonYear }, 'checkSimulationReadiness error');
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

    static async #getActiveModel() {
        const row = await db.get(`
            SELECT id, name, version, type, metadata_json, created_at
            FROM V3_Model_Registry
            WHERE name = 'global_1x2'
              AND is_active = 1
            ORDER BY id DESC
            LIMIT 1
        `);

        if (!row) return null;

        return {
            ...row,
            metadata: parseMetadata(row.metadata_json),
        };
    }

    /**
     * Get Simulation Results (Match-level predictions vs actuals)
     */
    static async getSimulationResults(simId) {
        try {
            const results = await db.all(`
                SELECT 
                    r.fixture_id,
                    r.market_type,
                    r.market_label,
                    r.model_version,
                    r.prob_home,
                    r.prob_draw,
                    r.prob_away,
                    r.predicted_score,
                    r.actual_winner,
                    r.is_correct,
                    r.predicted_outcome,
                    r.alternate_outcome,
                    r.actual_result,
                    r.primary_probability,
                    r.alternate_probability,
                    r.actual_numeric_value,
                    r.expected_total,
                    f.round as round_name,
                    f.date as fixture_date,
                    f.goals_home, f.goals_away,
                    f.score_halftime_home, f.score_halftime_away,
                    ht.name as home_team_name,
                    at.name as away_team_name
                FROM V3_Forge_Results r
                JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
                LEFT JOIN V3_Teams ht ON f.home_team_id = ht.team_id
                LEFT JOIN V3_Teams at ON f.away_team_id = at.team_id
                WHERE r.simulation_id = ?
                ORDER BY f.date ASC, f.fixture_id ASC, COALESCE(r.market_type, 'FT_1X2') ASC
            `, cleanParams([simId]));

            return results.map(r => {
                const mapResult = (val) => {
                    const statusMap = {
                        null: '-',
                        0: 'X',
                        1: '1',
                        2: '2'
                    };
                    return statusMap[val] || (val === null ? '-' : 'X');
                };

                const marketType = r.market_type || 'FT_1X2';
                const isOneXTwo = marketType === 'FT_1X2' || marketType === 'HT_1X2';
                const actualNumericValue = r.actual_numeric_value == null ? null : Number(r.actual_numeric_value);
                const expectedTotal = r.expected_total == null ? null : Number(r.expected_total);
                const actualScore = r.goals_home === null ? '-' : `${r.goals_home}-${r.goals_away}`;
                const actualHtScore = r.score_halftime_home === null ? '-' : `${r.score_halftime_home}-${r.score_halftime_away}`;
                const fallbackPredicted = (() => {
                    const home = Number(r.prob_home ?? -1);
                    const draw = Number(r.prob_draw ?? -1);
                    const away = Number(r.prob_away ?? -1);
                    if (home >= draw && home >= away) return '1';
                    if (away >= home && away >= draw) return '2';
                    return 'X';
                })();
                const predictedOutcome = r.predicted_outcome || fallbackPredicted;
                const actualResult = r.actual_result || mapResult(r.actual_winner);

                return {
                    fixture_id: r.fixture_id,
                    market_type: marketType,
                    market_label: r.market_label || 'FT 1X2',
                    model_version: r.model_version || null,
                    display_mode: isOneXTwo ? '1X2' : 'TOTALS',
                    fixture_date: r.fixture_date,
                    round_name: r.round_name,
                    home_team_name: r.home_team_name || 'Home',
                    away_team_name: r.away_team_name || 'Away',
                    prob_home: r.prob_home != null ? (Number(r.prob_home) * 100).toFixed(1) + '%' : '-',
                    prob_draw: r.prob_draw != null ? (Number(r.prob_draw) * 100).toFixed(1) + '%' : '-',
                    prob_away: r.prob_away != null ? (Number(r.prob_away) * 100).toFixed(1) + '%' : '-',
                    score: marketType === 'HT_1X2' ? actualHtScore : actualScore,
                    predicted_outcome: predictedOutcome,
                    alternate_outcome: r.alternate_outcome || null,
                    primary_probability: r.primary_probability != null ? (Number(r.primary_probability) * 100).toFixed(1) + '%' : null,
                    alternate_probability: r.alternate_probability != null ? (Number(r.alternate_probability) * 100).toFixed(1) + '%' : null,
                    actual_result: actualResult,
                    actual_numeric_value: actualNumericValue,
                    actual_numeric_label: actualNumericValue == null ? null : `${actualNumericValue.toFixed(0)}`,
                    expected_total: expectedTotal,
                    expected_total_label: expectedTotal == null ? null : expectedTotal.toFixed(2),
                    is_correct: r.is_correct === null ? null : Number(r.is_correct),
                };
            });

        } catch (err) {
            logger.error({ err, simId }, 'getSimulationResults error');
            return [];
        }
    }

    static async runBacktest({ leagueId = null, minEdge = 3, minConfidence = 60, dateRange = null, pickFilter = null } = {}) {
        const conditions = [
            `f.status_short IN ('FT', 'AET', 'PEN')`,
            `ra.bookmaker_odd IS NOT NULL`,
            `ra.edge IS NOT NULL`,
            `ra.ml_probability IS NOT NULL`
        ];
        const params = [];

        if (leagueId) {
            conditions.push(`f.league_id = ?`);
            params.push(leagueId);
        }
        if (minEdge != null) {
            conditions.push(`ra.edge >= ?`);
            params.push(minEdge);
        }
        if (minConfidence != null) {
            conditions.push(`ra.ml_probability >= ?`);
            params.push(Number(minConfidence) / 100);
        }
        if (dateRange?.[0] && dateRange?.[1]) {
            conditions.push(`f.date::date BETWEEN ? AND ?`);
            params.push(dateRange[0], dateRange[1]);
        }
        if (pickFilter) {
            conditions.push(`ra.selection = ?`);
            params.push(pickFilter);
        }

        const rows = await db.all(`
            SELECT
                ra.fixture_id,
                ra.market_type,
                ra.selection,
                ra.ml_probability,
                ra.bookmaker_odd,
                ra.fair_odd,
                ra.edge,
                f.date,
                f.league_id,
                f.goals_home,
                f.goals_away,
                f.score_halftime_home,
                f.score_halftime_away,
                l.name AS league_name,
                ht.name AS home_team,
                at.name AS away_team
            FROM V3_Risk_Analysis ra
            JOIN V3_Fixtures f ON ra.fixture_id = f.fixture_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY f.date ASC, ra.ml_probability DESC
        `, cleanParams(params));

        const picks = rows.map((row) => {
            const actual = row.market_type === '1N2_HT'
                ? (row.score_halftime_home > row.score_halftime_away ? '1' : row.score_halftime_home < row.score_halftime_away ? '2' : 'N')
                : (row.goals_home > row.goals_away ? '1' : row.goals_home < row.goals_away ? '2' : 'N');
            const isHit = row.selection === actual;
            const stake = 1;
            const pnl = isHit ? ((Number(row.bookmaker_odd) || 0) - 1) * stake : -stake;

            return {
                fixture_id: row.fixture_id,
                league_id: row.league_id,
                league_name: row.league_name,
                home_team: row.home_team,
                away_team: row.away_team,
                market_type: row.market_type,
                selection: row.selection,
                actual,
                hit: isHit,
                probability: Number(row.ml_probability),
                bookmaker_odd: row.bookmaker_odd == null ? null : Number(row.bookmaker_odd),
                fair_odd: row.fair_odd == null ? null : Number(row.fair_odd),
                edge: row.edge == null ? null : Number(row.edge),
                pnl
            };
        });

        const total = picks.length;
        const wins = picks.filter((pick) => pick.hit).length;
        const profit = picks.reduce((sum, pick) => sum + pick.pnl, 0);

        return {
            filters: { leagueId, minEdge, minConfidence, dateRange, pickFilter },
            summary: {
                total_bets: total,
                wins,
                losses: total - wins,
                hit_rate: total > 0 ? wins / total : 0,
                roi: total > 0 ? profit / total : 0,
                profit
            },
            picks
        };
    }

    static async runCalibrationAudit(leagueId = null) {
        const params = [];
        const leagueClause = leagueId ? `AND f.league_id = ?` : '';
        if (leagueId) {
            params.push(leagueId);
        }

        const rows = await db.all(`
            SELECT
                ra.market_type,
                ra.selection,
                ra.ml_probability,
                f.goals_home,
                f.goals_away,
                f.score_halftime_home,
                f.score_halftime_away
            FROM V3_Risk_Analysis ra
            JOIN V3_Fixtures f ON ra.fixture_id = f.fixture_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND ra.ml_probability IS NOT NULL
              ${leagueClause}
        `, cleanParams(params));

        const buckets = new Map();

        for (const row of rows) {
            const actual = row.market_type === '1N2_HT'
                ? (row.score_halftime_home > row.score_halftime_away ? '1' : row.score_halftime_home < row.score_halftime_away ? '2' : 'N')
                : (row.goals_home > row.goals_away ? '1' : row.goals_home < row.goals_away ? '2' : 'N');
            const isHit = row.selection === actual ? 1 : 0;
            const probability = Number(row.ml_probability);
            const lower = Math.floor(probability * 10) / 10;
            const upper = lower + 0.1;
            const key = `${row.market_type}_${lower.toFixed(1)}-${upper.toFixed(1)}`;

            if (!buckets.has(key)) {
                buckets.set(key, {
                    market_type: row.market_type,
                    bucket: `${lower.toFixed(1)}-${upper.toFixed(1)}`,
                    sample_size: 0,
                    predicted_mean: 0,
                    hit_rate: 0
                });
            }

            const bucket = buckets.get(key);
            bucket.sample_size += 1;
            bucket.predicted_mean += probability;
            bucket.hit_rate += isHit;
        }

        return Array.from(buckets.values())
            .map((bucket) => ({
                ...bucket,
                predicted_mean: bucket.sample_size > 0 ? bucket.predicted_mean / bucket.sample_size : 0,
                hit_rate: bucket.sample_size > 0 ? bucket.hit_rate / bucket.sample_size : 0,
                calibration_gap: bucket.sample_size > 0 ? (bucket.predicted_mean / bucket.sample_size) - (bucket.hit_rate / bucket.sample_size) : 0
            }))
            .sort((a, b) => a.market_type.localeCompare(b.market_type) || a.bucket.localeCompare(b.bucket));
    }
}

export default SimulationService;
