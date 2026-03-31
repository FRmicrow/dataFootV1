/**
 * Pre-2010 Historical Data Coverage Audit
 *
 * Scans V3_Import_Log and V3_Fixtures to present a summary of
 * processed files vs. DB fixtures for each league and season.
 */

import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'audit_pre2010_coverage' });

const LEAGUE_NAMES = {
    1: 'Ligue 1 (FR)',
    2: 'Serie A (IT)',
    3: 'LaLiga (ES)',
    4: 'Bundesliga (DE)',
    5: 'Premier League (EN)',
};

async function audit() {
    try {
        await db.init();

        const rows = await db.all(`
            SELECT
                l.league_id,
                l.season_year,
                l.status,
                l.files_total,
                l.files_ok,
                l.fixtures_created,
                l.fixtures_matched,
                (SELECT count(*) FROM V3_Fixtures f 
                 WHERE f.league_id = l.league_id 
                   AND f.season_year = l.season_year
                   AND (f.tm_match_id IS NOT NULL OR f.data_source LIKE 'transfermarkt%')) as db_fixtures
            FROM V3_Import_Log l
            ORDER BY league_id, season_year DESC
        `);

        console.log('\n========================================================================');
        console.log('🏆 Historical Data Coverage Audit (Pre-2010)');
        console.log('========================================================================\n');

        if (rows.length === 0) {
            console.log('  ⚠️  No import log entries found. Start an import first!\n');
            process.exit(0);
        }

        console.log(String('League').padEnd(20) + 
                    String('Season').padEnd(10) + 
                    String('JSON').padEnd(10) + 
                    String('DB').padEnd(10) + 
                    String('Match%').padEnd(10) + 
                    String('Status'));
        console.log('-'.repeat(72));

        for (const r of rows) {
            const league = LEAGUE_NAMES[r.league_id] || `ID: ${r.league_id}`;
            const season = `${r.season_year}-${r.season_year + 1}`;
            const jsonFiles = r.files_total || 0;
            const dbCount = r.db_fixtures || 0;
            const matchPct = jsonFiles > 0 ? ((dbCount / jsonFiles) * 100).toFixed(1) : '0.0';
            const statusMark = r.status === 'done' ? '✅' : (r.status === 'running' ? '⏳' : '❌');

            console.log(`${league.padEnd(20)}` + 
                        `${season.padEnd(10)}` + 
                        `${String(jsonFiles).padEnd(10)}` + 
                        `${String(dbCount).padEnd(10)}` + 
                        `${(matchPct + '%').padEnd(10)}` + 
                        `${statusMark} ${r.status}`);
        }

        console.log('\n========================================================================\n');

    } catch (err) {
        log.error({ err: err.message }, 'Audit failed');
    } finally {
        process.exit();
    }
}

audit();
