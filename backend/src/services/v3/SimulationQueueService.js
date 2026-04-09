import axios from 'axios';
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import logger from '../../utils/logger.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8008';
const RUNNING_STATES = ['PENDING', 'RUNNING'];
const ALLOWED_MODES = ['STATIC', 'WALK_FORWARD'];
const ALLOWED_HORIZONS = ['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING'];

const parseMetrics = (job) => {
    if (!job?.summary_metrics_json) return {};
    try {
        return JSON.parse(job.summary_metrics_json);
    } catch {
        return {};
    }
};

const withProgress = (job) => {
    if (!job) return job;
    const total = Number(job.total_months || 0);
    const completed = Number(job.completed_months || 0);
    const progress = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

    return {
        ...job,
        progress,
        completed_matches: completed,
        total_matches: total,
        metrics: parseMetrics(job),
    };
};

class SimulationQueueService {
    async init() {
        await this.#recoverInterruptedJobs();
        this.#startWatchdog();
    }

    #startWatchdog() {
        logger.info('Starting season simulation watchdog');

        setInterval(async () => {
            try {
                const staleJobs = await db.all(`
                    SELECT id
                    FROM V3_Forge_Simulations
                    WHERE status = 'RUNNING'
                      AND (
                        last_heartbeat < CURRENT_TIMESTAMP - INTERVAL '5 minutes'
                        OR (last_heartbeat IS NULL AND created_at < CURRENT_TIMESTAMP - INTERVAL '10 minutes')
                      )
                `);

                for (const job of staleJobs) {
                    logger.warn({ simulationId: job.id }, 'Marking stale simulation as failed');
                    await db.run(`
                        UPDATE V3_Forge_Simulations
                        SET status = 'FAILED',
                            stage = 'TIMED_OUT',
                            error_log = 'Heartbeat timeout while waiting for ml-service runner.'
                        WHERE id = ?
                    `, cleanParams([job.id]));
                }
            } catch (err) {
                logger.error({ err }, 'Season simulation watchdog failed');
            }
        }, 30000);
    }

    async #recoverInterruptedJobs() {
        logger.info('Recovering interrupted season simulations');

        try {
            const jobs = await db.all(`
                SELECT id
                FROM V3_Forge_Simulations
                WHERE status IN ('PENDING', 'RUNNING')
            `);

            for (const job of jobs) {
                await db.run(`
                    UPDATE V3_Forge_Simulations
                    SET status = 'FAILED',
                        stage = 'INTERRUPTED',
                        error_log = 'Backend restarted before simulation completed.'
                    WHERE id = ?
                `, cleanParams([job.id]));
            }
        } catch (err) {
            logger.warn({ err }, 'Could not recover interrupted simulations');
        }
    }

    async startSimulation(leagueId, seasonYear, mode = 'STATIC', horizon = 'FULL_HISTORICAL') {
        const safeLeagueId = Number.parseInt(leagueId, 10);
        const safeSeasonYear = Number.parseInt(seasonYear, 10);

        if (Number.isNaN(safeLeagueId) || Number.isNaN(safeSeasonYear)) {
            throw new Error('League ID and Season Year must be valid numbers');
        }
        if (!ALLOWED_MODES.includes(mode)) {
            throw new Error(`Invalid simulation mode: ${mode}`);
        }
        if (!ALLOWED_HORIZONS.includes(horizon)) {
            throw new Error(`Invalid horizon type: ${horizon}`);
        }

        const existing = await db.get(`
            SELECT id
            FROM V3_Forge_Simulations
            WHERE league_id = ?
              AND season_year = ?
              AND horizon_type = ?
              AND status IN ('PENDING', 'RUNNING')
            ORDER BY id DESC
            LIMIT 1
        `, cleanParams([safeLeagueId, safeSeasonYear, horizon]));

        if (existing) {
            throw new Error(`Simulation already active for League ${safeLeagueId} Season ${safeSeasonYear} [${horizon}] (ID: ${existing.id})`);
        }

        const activeModel = await db.get(`
            SELECT id
            FROM V3_Model_Registry
            WHERE name = 'global_1x2'
              AND is_active = 1
            ORDER BY id DESC
            LIMIT 1
        `);

        const inserted = await db.get(`
            INSERT INTO V3_Forge_Simulations (
                league_id,
                season_year,
                model_id,
                status,
                horizon_type,
                stage,
                last_heartbeat
            )
            VALUES (?, ?, ?, 'PENDING', ?, 'QUEUED', CURRENT_TIMESTAMP)
            RETURNING id
        `, cleanParams([
            safeLeagueId,
            safeSeasonYear,
            activeModel?.id || null,
            horizon,
        ]));

        const simulationId = inserted?.id;
        if (!simulationId) {
            throw new Error('Could not create simulation row');
        }

        try {
            const response = await axios.post(
                `${ML_SERVICE_URL}/simulations/run`,
                {
                    simulation_id: simulationId,
                    league_id: safeLeagueId,
                    season_year: safeSeasonYear,
                    horizon_type: horizon,
                    mode,
                },
                { timeout: 5000 }
            );

            logger.info({
                simulationId,
                leagueId: safeLeagueId,
                seasonYear: safeSeasonYear,
                horizon,
            }, 'Season simulation accepted by ml-service');

            return {
                success: true,
                message: response.data?.message || 'Season simulation accepted.',
                simulation_id: simulationId,
            };
        } catch (err) {
            const message = err.response?.data?.detail || err.message || 'ML service rejected simulation';
            await db.run(`
                UPDATE V3_Forge_Simulations
                SET status = 'FAILED',
                    stage = 'DISPATCH_ERROR',
                    error_log = ?
                WHERE id = ?
            `, cleanParams([message, simulationId]));

            logger.error({ err, simulationId }, 'Failed to dispatch season simulation');
            throw new Error(message);
        }
    }

    async getJobStatus(leagueId, seasonYear, horizon = null, simulationId = null) {
        if (simulationId) {
            const job = await db.get(`
                SELECT id, status, current_month, completed_months, total_months, horizon_type,
                       summary_metrics_json, stage, error_log, last_heartbeat, created_at, league_id, season_year
                FROM V3_Forge_Simulations
                WHERE id = ?
                LIMIT 1
            `, cleanParams([simulationId]));
            return withProgress(job);
        }

        const params = [leagueId, seasonYear];
        let sql = `
            SELECT id, status, current_month, completed_months, total_months, horizon_type,
                   summary_metrics_json, stage, error_log, last_heartbeat, created_at
            FROM V3_Forge_Simulations
            WHERE league_id = ?
              AND season_year = ?
        `;

        if (horizon) {
            sql += ` AND horizon_type = ?`;
            params.push(horizon);
        }

        sql += ` ORDER BY id DESC LIMIT 1`;

        const job = await db.get(sql, cleanParams(params));
        return withProgress(job);
    }

    async getAllSimulationsForLeague(leagueId) {
        const rows = await db.all(`
            SELECT
                s.id,
                s.league_id,
                l.name AS league_name,
                l.importance_rank,
                s.season_year,
                s.status,
                s.current_month,
                s.completed_months,
                s.total_months,
                s.horizon_type,
                s.summary_metrics_json,
                s.stage,
                s.error_log,
                s.last_heartbeat,
                s.created_at
            FROM V3_Forge_Simulations s
            LEFT JOIN V3_Leagues l ON s.league_id = l.league_id
            WHERE s.league_id = ?
            ORDER BY id DESC
        `, cleanParams([leagueId]));

        return rows.map(withProgress);
    }

    async getAllJobs() {
        const rows = await db.all(`
            SELECT
                s.id,
                s.league_id,
                l.name AS league_name,
                l.importance_rank,
                s.season_year,
                s.status,
                s.current_month,
                s.completed_months,
                s.total_months,
                s.horizon_type,
                s.summary_metrics_json,
                s.stage,
                s.error_log,
                s.last_heartbeat,
                s.created_at
            FROM V3_Forge_Simulations s
            LEFT JOIN V3_Leagues l ON s.league_id = l.league_id
            ORDER BY s.id DESC
            LIMIT 100
        `);

        return rows.map(withProgress);
    }

    startBulkRegen() {
        return {
            success: false,
            disabled: true,
            message: 'Legacy bulk Forge regeneration has been removed. Launch simulations individually from the new season simulation pipeline.',
        };
    }
}

const instance = new SimulationQueueService();
export default instance;
