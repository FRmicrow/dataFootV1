
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../../config/database.js';

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
        this._recoverActiveJobs();
        this._startWatchdog();
    }

    /**
     * US_213: Watchdog mechanism
     * Scans for 'RUNNING' jobs that have timed out (no heartbeat for > 2 mins).
     */
    _startWatchdog() {
        console.log('🐕 [US_213] Starting Forge Watchdog...');
        setInterval(() => {
            try {
                // Find jobs that haven't pulsed a heartbeat in 2 minutes
                const hangingJobs = db.all(`
                    SELECT id FROM V3_Forge_Simulations 
                    WHERE status = 'RUNNING' 
                    AND (
                        last_heartbeat < datetime('now', '-2 minutes')
                        OR (last_heartbeat IS NULL AND created_at < datetime('now', '-5 minutes'))
                    )
                `);

                hangingJobs.forEach(job => {
                    console.warn(`🚨 [US_213] Detected hanging simulation ${job.id}. Marking as FAILED (TIMEOUT-CRASH).`);
                    db.run(`
                        UPDATE V3_Forge_Simulations 
                        SET status = 'FAILED', 
                            error_log = 'Process heartbeat timeout. Possible crash or OOM.',
                            stage = 'CRASHED'
                        WHERE id = ?
                    `, [job.id]);
                });
            } catch (err) {
                console.error('❌ Watchdog Error:', err.message);
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Recovery logic: If the server restarts, we look for 'RUNNING' jobs in DB.
     * Note: We cannot recover the actual process object, but we allow the frontend
     * to see that a job *was* running. If the process is dead, we'll mark it as FAILED.
     */
    _recoverActiveJobs() {
        console.log('🔄 [US_207] Scanning for orphaned simulation jobs...');
        try {
            const runningJobs = db.all("SELECT id, league_id, season_year FROM V3_Forge_Simulations WHERE status = 'RUNNING'");

            runningJobs.forEach(job => {
                console.warn(`   ⚠️ Orphaned job detected: Sim ${job.id}. Marking as FAILED.`);
                db.run("UPDATE V3_Forge_Simulations SET status = 'FAILED', error_log = 'Server restarted. Job interrupted.' WHERE id = ?", [job.id]);
            });
        } catch (err) {
            console.warn('   ⚠️ Could not recover orphaned jobs (DB might not be ready yet):', err.message);
        }
    }

    startSimulation(leagueId, seasonYear, mode = 'STATIC', horizon = 'FULL_HISTORICAL', isAudit = 0, calibrationTag = null) {
        const existing = db.get("SELECT id FROM V3_Forge_Simulations WHERE league_id = ? AND season_year = ? AND horizon_type = ? AND status = 'RUNNING'", [leagueId, seasonYear, horizon]);
        if (existing) {
            throw new Error(`Simulation already active for League ${leagueId} Season ${seasonYear} [${horizon}] (ID: ${existing.id})`);
        }

        console.log(`🚀 [US_207] Spawning Forge Process: ${leagueId} | ${seasonYear} | ${horizon} | Audit: ${isAudit}`);

        // Insert new simulation record with Audit and Calibration fields (US_223)
        const insertStmt = db.run(`
            INSERT INTO V3_Forge_Simulations (league_id, season_year, status, horizon_type, stage, last_heartbeat, is_audit, calibration_tag)
            VALUES (?, ?, 'RUNNING', ?, 'INIT', datetime('now'), ?, ?)
        `, [leagueId, seasonYear, horizon, isAudit, calibrationTag]);

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

        pythonProcess.stdout.on('data', (data) => {
            const line = data.toString().trim();

            // Heartbeat/Sync detection (US_213)
            if (line.includes('HEARTBEAT:')) {
                db.run("UPDATE V3_Forge_Simulations SET last_heartbeat = datetime('now') WHERE id = ?", [simId]);
            }

            // Progress/Stage detection (US_214)
            if (line.includes('STAGE:')) {
                const stage = line.split('STAGE:')[1].trim();
                db.run("UPDATE V3_Forge_Simulations SET stage = ? WHERE id = ?", [stage, simId]);
            }

            if (line.includes('PROGRESS:')) {
                const match = line.match(/PROGRESS:\s*(\d+)%/);
                if (match) {
                    const progress = parseInt(match[1]);
                    db.run("UPDATE V3_Forge_Simulations SET completed_months = ?, status = 'RUNNING' WHERE id = ?",
                        [progress, simId]);
                }
            }
            console.log(`[FORGE-OUT][ID:${simId}]: ${line}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            const line = data.toString().trim();
            if (line.toLowerCase().includes('error')) {
                console.error(`[FORGE-ERR][ID:${simId}]: ${line}`);
                // Capture error log (US_214)
                db.run("UPDATE V3_Forge_Simulations SET error_log = ? WHERE id = ?", [line, simId]);
            }
        });

        pythonProcess.on('close', (code) => {
            console.log(`📡 Forge process for Sim ${simId} exited with code ${code}`);
            this.activeProcesses.delete(`${leagueId}-${seasonYear}`);

            if (code !== 0) {
                db.run("UPDATE V3_Forge_Simulations SET status = 'FAILED', stage = 'ERROR' WHERE id = ?", [simId]);
            }
        });

        this.activeProcesses.set(`${leagueId}-${seasonYear}`, pythonProcess);
        return { success: true, message: 'Forge orchestration successfully spawned.' };
    }

    getJobStatus(leagueId, seasonYear, horizon = null) {
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

        const job = db.get(sql, params);
        if (job && job.summary_metrics_json) {
            try {
                job.metrics = JSON.parse(job.summary_metrics_json);
            } catch (e) {
                job.metrics = {};
            }
        }
        return job;
    }

    getAllSimulationsForLeague(leagueId) {
        const sql = `
            SELECT id, season_year, status, horizon_type, summary_metrics_json, stage, is_audit, calibration_tag, last_heartbeat
            FROM V3_Forge_Simulations
            WHERE league_id = ?
            ORDER BY id DESC
        `;
        const rows = db.all(sql, [leagueId]);
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
