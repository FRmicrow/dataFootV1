
import { spawn } from 'child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mlServicePath = path.resolve(__dirname, '../../../../ml-service');
const venvPythonPath = path.join(mlServicePath, 'venv/bin/python');

/**
 * US_207: Stateless Simulation Tracker
 * Handles background execution and survives server restarts.
 */
class SimulationQueueService {
    constructor() {
        this.activeProcesses = new Map(); // Store child_process objects
    }

    async init() {
        this._recoverActiveJobs();
        this._startWatchdog();
    }

    /**
     * US_213: Watchdog mechanism
     * Scans for 'RUNNING' jobs that have timed out (no heartbeat for > 2 mins).
     */
    _startWatchdog() {
        logger.info('🐕 [US_213] Starting Forge Watchdog...');
        setInterval(async () => {
            try {
                // Find jobs that haven't pulsed a heartbeat in 2 minutes
                const hangingJobs = await db.all(`
                    SELECT id FROM V3_Forge_Simulations 
                    WHERE status = 'RUNNING' 
                    AND (
                        last_heartbeat < CURRENT_TIMESTAMP - INTERVAL '2 minutes'
                        OR (last_heartbeat IS NULL AND created_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes')
                    )
                `);

                for (const job of hangingJobs) {
                    logger.warn(`🚨 [US_213] Detected hanging simulation ${job.id}. Marking as FAILED (TIMEOUT-CRASH).`);
                    await db.run(`
                        UPDATE V3_Forge_Simulations 
                        SET status = 'FAILED', 
                            error_log = 'Process heartbeat timeout. Possible crash or OOM.',
                            stage = 'CRASHED'
                        WHERE id = ?
                    `, cleanParams([job.id]));
                }
            } catch (err) {
                logger.error({ err }, '❌ Watchdog Error');
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Recovery logic: If the server restarts, we look for 'RUNNING' jobs in DB.
     * Note: We cannot recover the actual process object, but we allow the frontend
     * to see that a job *was* running. If the process is dead, we'll mark it as FAILED.
     */
    async _recoverActiveJobs() {
        logger.info('🔄 [US_207] Scanning for orphaned simulation jobs...');
        try {
            const runningJobs = await db.all("SELECT id, league_id, season_year FROM V3_Forge_Simulations WHERE status = 'RUNNING'");

            for (const job of runningJobs) {
                logger.warn(`   ⚠️ Orphaned job detected: Sim ${job.id}. Marking as FAILED.`);
                await db.run("UPDATE V3_Forge_Simulations SET status = 'FAILED', error_log = 'Server restarted. Job interrupted.' WHERE id = ?", cleanParams([job.id]));
            }
        } catch (err) {
            logger.warn({ err }, '   ⚠️ Could not recover orphaned jobs (DB might not be ready yet)');
        }
    }

    async startSimulation(
        leagueId,
        seasonYear,
        mode = 'STATIC',
        horizon = 'FULL_HISTORICAL',
        isAudit = 0,
        calibrationTag = null
    ) {
        // Validation - US_251 Remediation
        const allowedModes = ['STATIC', 'WALK_FORWARD'];
        const allowedHorizons = ['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING'];

        const safeLeagueId = Number.parseInt(leagueId);
        const safeSeasonYear = Number.parseInt(seasonYear);
        if (Number.isNaN(safeLeagueId) || Number.isNaN(safeSeasonYear)) throw new Error("League ID and Season Year must be valid numbers");
        if (!allowedModes.includes(mode)) throw new Error(`Invalid simulation mode: ${mode}`);
        if (!allowedHorizons.includes(horizon)) throw new Error(`Invalid horizon type: ${horizon}`);

        const existing = await db.get("SELECT id FROM V3_Forge_Simulations WHERE league_id = ? AND season_year = ? AND horizon_type = ? AND status = 'RUNNING'", cleanParams([leagueId, seasonYear, horizon]));
        if (existing) {
            throw new Error(`Simulation already active for League ${leagueId} Season ${seasonYear} [${horizon}] (ID: ${existing.id})`);
        }

        logger.info(`🚀 [US_207] Spawning Forge Process: ${leagueId} | ${seasonYear} | ${horizon} | Audit: ${isAudit}`);

        // Insert new simulation record with Audit and Calibration fields (US_223)
        const insertStmt = await db.run(`
            INSERT INTO V3_Forge_Simulations (league_id, season_year, status, horizon_type, stage, last_heartbeat, is_audit, calibration_tag)
            VALUES (?, ?, 'RUNNING', ?, 'INIT', CURRENT_TIMESTAMP, ?, ?)
        `, cleanParams([leagueId, seasonYear, horizon, isAudit, calibrationTag]));

        const simId = insertStmt.lastInsertRowid;

        const pyArgs = [
            path.join(mlServicePath, 'forge_orchestrator.py'),
            '--league', String(leagueId),
            '--season', String(seasonYear),
            '--mode', mode,
            '--horizon', horizon,
            '--sim_id', String(simId)
        ];

        const pythonProcess = spawn(venvPythonPath, pyArgs, { cwd: mlServicePath });

        pythonProcess.stdout.on('data', async data => {
            const line = data.toString().trim();

            // Heartbeat/Sync detection (US_213)
            if (line.includes('HEARTBEAT:')) {
                await db.run("UPDATE V3_Forge_Simulations SET last_heartbeat = CURRENT_TIMESTAMP WHERE id = ?", cleanParams([simId]));
            }

            // Progress/Stage detection (US_214)
            if (line.includes('STAGE:')) {
                const stage = line.split('STAGE:')[1].trim();
                await db.run("UPDATE V3_Forge_Simulations SET stage = ? WHERE id = ?", cleanParams([stage, simId]));
            }

            if (line.includes('PROGRESS:')) {
                const match = line.match(/PROGRESS:\s*(\d+)%/);
                if (match) {
                    const progress = Number.parseInt(match[1]);
                    await db.run("UPDATE V3_Forge_Simulations SET completed_months = ?, status = 'RUNNING' WHERE id = ?",
                        cleanParams([progress, simId]));
                }
            }
            logger.info(`[FORGE-OUT][ID:${simId}]: ${line}`);
        });

        pythonProcess.stderr.on('data', async data => {
            const line = data.toString().trim();
            if (line.toLowerCase().includes('error')) {
                logger.error(`[FORGE-ERR][ID:${simId}]: ${line}`);
                // Capture error log (US_214)
                await db.run("UPDATE V3_Forge_Simulations SET error_log = ? WHERE id = ?", cleanParams([line, simId]));
            }
        });

        pythonProcess.on('close', async code => {
            logger.info(`📡 Forge process for Sim ${simId} exited with code ${code}`);
            this.activeProcesses.delete(`${leagueId}-${seasonYear}`);

            if (code !== 0) {
                await db.run("UPDATE V3_Forge_Simulations SET status = 'FAILED', stage = 'ERROR' WHERE id = ?", cleanParams([simId]));
            }
        });

        this.activeProcesses.set(`${leagueId}-${seasonYear}`, pythonProcess);
        return { success: true, message: 'Forge orchestration successfully spawned.' };
    }

    async getJobStatus(leagueId, seasonYear, horizon = null) {
        let sql = `
            SELECT id, status, completed_months as progress, current_month, horizon_type, 
                   summary_metrics_json, stage, error_log, is_audit, calibration_tag, last_heartbeat
            FROM V3_Forge_Simulations 
            WHERE league_id = ? AND season_year = ? 
        `;

        const params = [leagueId, seasonYear];

        if (horizon) {
            sql += ` AND horizon_type = ? `;
            params.push(horizon);
        }

        sql += ` ORDER BY id DESC LIMIT 1 `;

        const job = await db.get(sql, cleanParams(params));
        if (job && job.summary_metrics_json) {
            try {
                job.metrics = JSON.parse(job.summary_metrics_json);
            } catch (e) {
                job.metrics = {};
            }
        }
        return job;
    }

    async getAllSimulationsForLeague(leagueId) {
        const sql = `
            SELECT id, season_year, status, horizon_type, summary_metrics_json, stage, is_audit, calibration_tag, last_heartbeat
            FROM V3_Forge_Simulations
            WHERE league_id = ?
            ORDER BY id DESC
        `;
        const rows = await db.all(sql, cleanParams([leagueId]));
        return rows.map(job => {
            if (job.summary_metrics_json) {
                try { job.metrics = JSON.parse(job.summary_metrics_json); } catch (e) { job.metrics = {}; }
            }
            return job;
        });
    }

    /**
     * Sequential Rebuild All (US_206)
     * Triggers the background worker to sequentially process all horizons for all leagues.
     */
    startBulkRegen() {
        const workerPath = path.resolve(__dirname, '../../workers/bulkForgeWorker.js');
        // US_206 mandate: spawn as a totally independent process
        const nodeProcess = spawn('node', [workerPath], {
            cwd: process.cwd(),
            detached: true,
            stdio: 'ignore'
        });
        nodeProcess.unref();

        return { success: true, message: 'Bulk Regeneration sequence triggered in background.' };
    }
}

const instance = new SimulationQueueService();
export default instance;
