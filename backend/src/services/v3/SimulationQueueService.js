
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
    }

    /**
     * Recovery logic: If the server restarts, we look for 'RUNNING' jobs in DB.
     * Note: We cannot recover the actual process object, but we allow the frontend
     * to see that a job *was* running. If the process is dead, we'll mark it as FAILED.
     */
    _recoverActiveJobs() {
        console.log('🔄 [US_207] Scanning for orphaned simulation jobs...');
        const runningJobs = db.prepare("SELECT id, league_id, season_year FROM V3_Forge_Simulations WHERE status = 'RUNNING'").all();

        runningJobs.forEach(job => {
            console.warn(`   ⚠️ Orphaned job detected: Sim ${job.id}. Marking for health check.`);
            // Since we lost the child_process, we mark it as FAILED so the user can restart.
            // A more advanced version would check if the PID is still alive.
            db.run("UPDATE V3_Forge_Simulations SET status = 'FAILED' WHERE id = ?", [job.id]);
        });
    }

    startSimulation(leagueId, seasonYear, mode = 'STATIC', horizon = 'FULL_HISTORICAL') {
        const existing = db.get("SELECT id FROM V3_Forge_Simulations WHERE league_id = ? AND season_year = ? AND status = 'RUNNING'", [leagueId, seasonYear]);
        if (existing) {
            throw new Error(`Simulation already active for League ${leagueId} Season ${seasonYear} (ID: ${existing.id})`);
        }

        console.log(`🚀 [US_207] Spawning Forge Process: ${leagueId} | ${seasonYear} | ${horizon}`);

        const pyArgs = [
            path.join(mlServicePath, 'forge_orchestrator.py'),
            '--league', String(leagueId),
            '--season', String(seasonYear),
            '--mode', mode,
            '--horizon', horizon
        ];

        const pythonProcess = spawn(venvPythonPath, pyArgs, { cwd: mlServicePath });

        pythonProcess.stdout.on('data', (data) => {
            const line = data.toString().trim();
            if (line.includes('PROGRESS:')) {
                const match = line.match(/PROGRESS:\s*(\d+)%/);
                if (match) {
                    const progress = parseInt(match[1]);
                    db.run("UPDATE V3_Forge_Simulations SET completed_months = ?, status = 'RUNNING' WHERE league_id = ? AND season_year = ? AND status IN ('PENDING', 'RUNNING')",
                        [progress, leagueId, seasonYear]);
                }
            }
            console.log(`[FORGE-OUT]: ${line}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            const line = data.toString().trim();
            if (line.toLowerCase().includes('error')) {
                console.error(`[FORGE-ERR]: ${line}`);
            }
        });

        pythonProcess.on('close', (code) => {
            console.log(`📡 Forge process for League ${leagueId} exited with code ${code}`);
            this.activeProcesses.delete(`${leagueId}-${seasonYear}`);

            if (code !== 0) {
                db.run("UPDATE V3_Forge_Simulations SET status = 'FAILED' WHERE league_id = ? AND season_year = ? AND status = 'RUNNING'", [leagueId, seasonYear]);
            }
            // Note: success status is handled by the Python script itself calling settle_simulation()
        });

        this.activeProcesses.set(`${leagueId}-${seasonYear}`, pythonProcess);
        return { success: true, message: 'Forge orchestration successfully spawned.' };
    }

    getJobStatus(leagueId, seasonYear) {
        const sql = `
            SELECT id, status, completed_months as progress, current_month, horizon_type, summary_metrics_json 
            FROM V3_Forge_Simulations 
            WHERE league_id = ? AND season_year = ? 
            ORDER BY id DESC LIMIT 1
        `;
        const job = db.get(sql, [leagueId, seasonYear]);
        if (job && job.summary_metrics_json) {
            try {
                job.metrics = JSON.parse(job.summary_metrics_json);
            } catch (e) {
                job.metrics = {};
            }
        }
        return job;
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
