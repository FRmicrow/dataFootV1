import sqlite3 from 'sqlite3';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../database.sqlite');
const mlServicePath = path.resolve(__dirname, '../../../ml-service');
const venvPythonPath = path.join(mlServicePath, 'venv/bin/python3');

const db = new sqlite3.Database(dbPath);

const HORIZONS = ['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING'];

console.log("🚀 [US_206] Starting Sequential Quant Regeneration Worker...");

// 1. Mark any previously RUNNING jobs as FAILED since we are restarting.
db.run(`UPDATE V3_Forge_Bulk_Jobs SET status = 'FAILED' WHERE status = 'RUNNING'`, [], () => {

    // 2. Fetch all unique League + Season combos
    const query = `
        SELECT DISTINCT f.league_id, f.season_year, l.importance_rank, l.name
        FROM V3_Fixtures f
        JOIN V3_Leagues l ON f.league_id = l.league_id
        WHERE f.status_short IN ('FT', 'AET', 'PEN')
        ORDER BY l.importance_rank ASC, f.season_year DESC
    `;

    db.all(query, [], async (err, rows) => {
        if (err) {
            console.error("❌ Database query failed:", err);
            return;
        }

        if (!rows || rows.length === 0) {
            console.log("No valid seasons found to simulate.");
            return;
        }

        const tasks = [];
        rows.forEach(row => {
            HORIZONS.forEach(horizon => {
                tasks.push({ ...row, horizon });
            });
        });

        console.log(`📋 Prescribing ${tasks.length} total tasks (${rows.length} seasons x ${HORIZONS.length} horizons).`);

        // Create tracking table if missing
        db.run(`CREATE TABLE IF NOT EXISTS V3_Forge_Bulk_Jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total_leagues INTEGER,
            completed_leagues INTEGER DEFAULT 0,
            status TEXT DEFAULT 'RUNNING',
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, function () {
            db.run(`INSERT INTO V3_Forge_Bulk_Jobs (total_leagues, status) VALUES (?, 'RUNNING')`, [tasks.length], function (err) {
                const bulkJobId = this.lastID;
                console.log(`📌 Bulk Job ID: ${bulkJobId} tracked in V3_Forge_Bulk_Jobs.`);
                runNext(0, tasks, bulkJobId);
            });
        });
    });
});

function runNext(index, tasks, bulkJobId) {
    if (index >= tasks.length) {
        console.log(`\n✅ [Bulk Job ${bulkJobId}] ALL TASKS COMPLETE! Quant Engine Fully Recalibrated.`);
        db.run(`UPDATE V3_Forge_Bulk_Jobs SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [bulkJobId], () => {
            process.exit(0);
        });
        return;
    }

    const task = tasks[index];
    console.log(`\n⏳ [Task ${index + 1}/${tasks.length}] ${task.name} (${task.season_year}) | HORIZON: ${task.horizon}`);

    const pyArgs = [
        path.join(mlServicePath, 'forge_orchestrator.py'),
        '--league', String(task.league_id),
        '--season', String(task.season_year),
        '--mode', 'STATIC',
        '--horizon', task.horizon
    ];

    const pythonProcess = spawn(venvPythonPath, pyArgs, { cwd: mlServicePath });

    pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim() !== '');
        lines.forEach(line => {
            if (line.includes('PROGRESS:') || line.includes('Complete!')) {
                console.log(`   [Python] ${line}`);
            }
        });
    });

    pythonProcess.stderr.on('data', (data) => {
        const errorLine = data.toString().trim();
        if (!errorLine.includes('UserWarning') && !errorLine.includes('X does not have valid')) {
            console.error(`   [Python Err] ${errorLine}`);
        }
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            console.log(`   ✅ Success: ${task.name} ${task.horizon}`);
        } else {
            console.log(`   ❌ Failed: ${task.name} ${task.horizon} (Code: ${code})`);
        }

        // Update DB Tracker
        db.run(`UPDATE V3_Forge_Bulk_Jobs SET completed_leagues = completed_leagues + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [bulkJobId], () => {
            // Queue next
            runNext(index + 1, tasks, bulkJobId);
        });
    });
}
