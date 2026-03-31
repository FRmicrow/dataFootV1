/**
 * Historical Import Monitor
 *
 * Provides a real-time status board of all historical ingestion jobs
 * by querying the V3_Import_Log table.
 */

import 'dotenv/config';
import db from '../../src/config/database.js';

async function monitor() {
    try {
        await db.init();
        
        console.log('\n--- 📊 Historical Import Status Board ---');
        console.log('----------------------------------------------------------');
        console.log('League ID | Season | Status  | Match% | Fixtures | Started At');
        console.log('----------------------------------------------------------');

        const logs = await db.all(`
            SELECT 
                l.league_id, l.season_year, l.status,
                l.files_ok, l.files_total, l.fixtures_created,
                l.started_at
            FROM V3_Import_Log l
            ORDER BY l.started_at DESC
            LIMIT 50
        `);

        for (const log of logs) {
            const perc = log.files_total > 0 ? ((log.files_ok / log.files_total) * 100).toFixed(1) : '0.0';
            const status = log.status.padEnd(8);
            const league = String(log.league_id).padEnd(9);
            const season = String(log.season_year).padEnd(6);
            const startStr = log.started_at ? new Date(log.started_at).toLocaleString() : 'N/A';
            
            console.log(`${league} | ${season} | ${status} | ${perc}%  | ${log.fixtures_created} | ${startStr}`);
        }

        const stats = await db.get(`
            SELECT 
                count(*) filter (where status='done') as done,
                count(*) filter (where status='running') as running,
                count(*) filter (where status='failed') as failed
            FROM V3_Import_Log
        `);

        console.log('----------------------------------------------------------');
        console.log(`Summary: ✅ ${stats.done || 0} Done | 🏃 ${stats.running || 0} Running | ❌ ${stats.failed || 0} Failed`);
        console.log('----------------------------------------------------------\n');

        process.exit(0);
    } catch (e) {
        console.error('Monitor failed:', e.message);
        process.exit(1);
    }
}

monitor();
