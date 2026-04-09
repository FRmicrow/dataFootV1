/**
 * import_understat_xg.js
 *
 * Populates v4.matches.xg_home, xg_away, forecast_win, forecast_draw, forecast_loss
 * from UnderStat all_matches.json files, using v4.external_match_mapping (source='understat').
 *
 * Only processes matches mapped with HIGH or MEDIUM confidence.
 * Idempotent: skips matches already having xg_home set.
 *
 * Usage:
 *   docker compose exec -e UNDERSTAT_DIR=/data/understat/understat backend node scripts/import_understat_xg.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/config/database.js';
import { createChildLogger } from '../src/utils/logger.js';

const logger = createChildLogger('UnderstatXGImport');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UNDERSTAT_DIR = process.env.UNDERSTAT_DIR ?? path.resolve(__dirname, '../../UnderStat/understat');

const LEAGUE_FILES = [
    'understat_epl_all_matches.json',
    'understat_laliga_all_matches.json',
    'understat_bundesliga_all_matches.json',
    'understat_seriea_all_matches.json',
    'understat_ligue1_all_matches.json',
];

async function main() {
    await db.init();
    logger.info('Starting UnderStat xG + forecast import into v4.matches...');

    const stats = { updated: 0, skipped_no_map: 0, skipped_already: 0, skipped_no_xg: 0 };

    for (const fileName of LEAGUE_FILES) {
        const filePath = path.join(UNDERSTAT_DIR, fileName);
        if (!fs.existsSync(filePath)) {
            logger.warn({ file: fileName }, 'File not found — skipping');
            continue;
        }

        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        const matches = data.matches ?? data;

        logger.info({ file: fileName, count: matches.length }, 'Processing file');

        for (const m of matches) {
            const externalId = String(m.match_id);

            if (!m.home_xg || !m.away_xg) {
                stats.skipped_no_xg++;
                continue;
            }

            // Lookup mapping (HIGH or MEDIUM only)
            const mapping = await db.get(
                `SELECT v4_match_id FROM v4.external_match_mapping
                 WHERE source = 'understat'
                   AND external_id = $1
                   AND confidence IN ('HIGH', 'MEDIUM')
                   AND v4_match_id IS NOT NULL`,
                [externalId]
            );

            if (!mapping) {
                stats.skipped_no_map++;
                continue;
            }

            // Update xg_home/away if not set yet
            await db.run(
                `UPDATE v4.matches
                 SET xg_home = $1, xg_away = $2
                 WHERE match_id = $3 AND xg_home IS NULL`,
                [parseFloat(m.home_xg), parseFloat(m.away_xg), mapping.v4_match_id]
            );

            // Update forecast independently (always overwrite if source has data)
            const forecastW = m.forecast?.w ? parseFloat(m.forecast.w) : null;
            const forecastD = m.forecast?.d ? parseFloat(m.forecast.d) : null;
            const forecastL = m.forecast?.l ? parseFloat(m.forecast.l) : null;

            const result = await db.run(
                `UPDATE v4.matches
                 SET forecast_win = $1, forecast_draw = $2, forecast_loss = $3
                 WHERE match_id = $4 AND forecast_win IS NULL`,
                [forecastW, forecastD, forecastL, mapping.v4_match_id]
            );

            if ((result.changes ?? 0) > 0) {
                stats.updated++;
            } else {
                stats.skipped_already++;
            }
        }
    }

    logger.info({
        updated:          stats.updated,
        skipped_no_map:   stats.skipped_no_map,
        skipped_already:  stats.skipped_already,
        skipped_no_xg:    stats.skipped_no_xg,
    }, '=== XG IMPORT REPORT ===');

    process.exit(0);
}

main().catch(err => {
    logger.error({ err }, 'Fatal error in import_understat_xg');
    process.exit(1);
});
