/**
 * import_csv_data.js
 *
 * Processes all CSV files from the external database and:
 *   1. Builds v4.external_match_mapping (source='csv') via date + teams + competition
 *   2. Inserts into v4.match_stats (possession, shots, corners, cards + HT score)
 *   3. Inserts into v4.match_odds (1X2, O/U, BTTS)
 *
 * CSV files structure (LS = last seasons 2015→2024/25, CS = current season 2025/26):
 *   - Database - Overview - {COMP} - {LS|CS}.csv     → match identity + score
 *   - Database - Scores   - {COMP} - {LS|CS}.csv     → HT score
 *   - Database - Attack  Poss - {COMP} - {LS|CS}.csv → possession + shots
 *   - Database - Corners  Cards - {COMP} - {LS|CS}.csv → corners + cards
 *   - Database - Odds    - {COMP} - {LS|CS}.csv       → betting odds
 *
 * All files share the same "id" field → single external_id per match.
 *
 * Idempotent: ON CONFLICT DO NOTHING throughout.
 *
 * Usage:
 *   docker compose exec -e CSV_DIR=/data/csv backend node scripts/import_csv_data.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import db from '../src/config/database.js';
import { createChildLogger } from '../src/utils/logger.js';

const logger = createChildLogger('CSVImport');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_DIR = process.env.CSV_DIR ?? '/data/csv';
const NAME_THRESHOLD = 0.15;

// CSV competition name → v4.competitions.name
const COMP_MAP = {
    'England Premier League': 'Premier League',
    'France Ligue 1':         'Ligue 1',
    'Germany Bundesliga':     'Bundesliga',
    'Italy Serie A':          'Serie A',
    'Spain LaLiga':           'LaLiga',
    'Europe Champions League':'Champions League',
    'Europe Europa League':   'Europa League',
    'Europe Conference League':'Conference League',
};

// ─── CSV parsing ─────────────────────────────────────────────────────────────

function parseCSVLine(line) {
    const result = [];
    let inQuote = false, current = '';
    for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; continue; }
        if (ch === ',' && !inQuote) { result.push(current); current = ''; continue; }
        current += ch;
    }
    result.push(current);
    return result;
}

async function readCSV(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const rows = [];
    const rl = readline.createInterface({ input: fs.createReadStream(filePath) });
    let headers = null;
    for await (const line of rl) {
        const cells = parseCSVLine(line);
        if (!headers) { headers = cells; continue; }
        const row = {};
        headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
        rows.push(row);
    }
    return rows;
}

function int(v)   { const n = parseInt(v, 10);   return isNaN(n) ? null : n; }
function float(v) { const n = parseFloat(v);      return isNaN(n) ? null : n; }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    await db.init();
    logger.info('Starting CSV data import...');

    // Pre-load v4 competition IDs
    const v4Comps = {};
    for (const [csvName, v4Name] of Object.entries(COMP_MAP)) {
        const row = await db.get(`SELECT competition_id FROM v4.competitions WHERE name = $1`, [v4Name]);
        if (row) {
            v4Comps[csvName] = row.competition_id;
        } else {
            logger.warn({ csvName, v4Name }, 'v4 competition not found — will skip');
        }
    }

    const overallStats = { mapped_high: 0, mapped_medium: 0, unmatched: 0, stats_inserted: 0, odds_inserted: 0 };

    for (const [csvCompName, competitionId] of Object.entries(v4Comps)) {

        for (const suffix of ['LS', 'CS']) {
            const prefix = `Database - `;
            const suffix2 = ` - ${csvCompName} - ${suffix}.csv`;

            const overviewFile = path.join(CSV_DIR, `${prefix}Overview${suffix2}`);
            const scoresFile   = path.join(CSV_DIR, `${prefix}Scores${suffix2}`);
            const attackFile   = path.join(CSV_DIR, `${prefix}Attack  Poss${suffix2}`);
            const cornersFile  = path.join(CSV_DIR, `${prefix}Corners  Cards${suffix2}`);
            const oddsFile     = path.join(CSV_DIR, `${prefix}Odds${suffix2}`);

            const overview = await readCSV(overviewFile);
            if (!overview) {
                logger.debug({ file: overviewFile }, 'Overview file not found — skipping');
                continue;
            }

            // Index secondary files by "id"
            const scoresRows  = await readCSV(scoresFile)  ?? [];
            const attackRows  = await readCSV(attackFile)  ?? [];
            const cornersRows = await readCSV(cornersFile) ?? [];
            const oddsRows    = await readCSV(oddsFile)    ?? [];

            const scoresById  = Object.fromEntries(scoresRows.map(r  => [r.id, r]));
            const attackById  = Object.fromEntries(attackRows.map(r  => [r.id, r]));
            const cornersById = Object.fromEntries(cornersRows.map(r => [r.id, r]));
            const oddsById    = Object.fromEntries(oddsRows.map(r    => [r.id, r]));

            logger.info({ comp: csvCompName, suffix, rows: overview.length }, 'Processing CSV batch');

            const batchStats = { high: 0, medium: 0, unmatched: 0, stats: 0, odds: 0 };

            for (const row of overview) {
                const externalId = row.id;
                if (!externalId) continue;

                // Parse date: "05-03-26 21:00" → "2026-03-05"  or  "2015-08-08" (already ISO)
                let matchDate;
                const rawDate = row.matchDate ?? '';
                if (rawDate.match(/^\d{2}-\d{2}-\d{2}/)) {
                    // DD-MM-YY HH:MM → YYYY-MM-DD
                    const [datePart] = rawDate.split(' ');
                    const [dd, mm, yy] = datePart.split('-');
                    matchDate = `20${yy}-${mm}-${dd}`;
                } else if (rawDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                    matchDate = rawDate.slice(0, 10);
                } else {
                    continue; // unparseable date
                }

                const homeTeam = row.homeTeam ?? '';
                const awayTeam = row.awayTeam ?? '';
                if (!homeTeam || !awayTeam) continue;

                // Check if already mapped
                const existing = await db.get(
                    `SELECT id, v4_match_id FROM v4.external_match_mapping
                     WHERE source = 'csv' AND external_id = $1`,
                    [externalId]
                );

                let v4MatchId = existing?.v4_match_id ?? null;

                if (!existing) {
                    // Find v4 match candidates
                    const candidates = await db.all(
                        `SELECT
                            m.match_id,
                            hc.name AS home_name,
                            ac.name AS away_name,
                            similarity(hc.name, $1) AS sim_h,
                            similarity(ac.name, $2) AS sim_a,
                            word_similarity($1, hc.name) AS wsim_h,
                            word_similarity($2, ac.name) AS wsim_a
                        FROM v4.matches m
                        JOIN v4.clubs hc ON hc.club_id = m.home_club_id
                        JOIN v4.clubs ac ON ac.club_id = m.away_club_id
                        WHERE m.competition_id = $3
                          AND m.match_date     = $4::DATE
                          AND (similarity(hc.name, $1) > $5 OR word_similarity($1, hc.name) > $5)
                          AND (similarity(ac.name, $2) > $5 OR word_similarity($2, ac.name) > $5)`,
                        [homeTeam, awayTeam, competitionId, matchDate, NAME_THRESHOLD]
                    );

                    if (candidates.length === 0) {
                        await db.run(
                            `INSERT INTO v4.external_match_mapping
                                 (source, external_id, v4_match_id, strategy, confidence, notes)
                             VALUES ('csv', $1, NULL, 'UNMATCHED', 'NONE', $2)
                             ON CONFLICT (source, external_id) DO NOTHING`,
                            [externalId, `no candidate on ${matchDate}: ${homeTeam} vs ${awayTeam} (${csvCompName})`]
                        );
                        batchStats.unmatched++;
                        continue;
                    }

                    let best = null, bestScore = -1;
                    for (const c of candidates) {
                        const simH = Math.max(parseFloat(c.sim_h), parseFloat(c.wsim_h));
                        const simA = Math.max(parseFloat(c.sim_a), parseFloat(c.wsim_a));
                        const score = simH * 1.5 + simA * 1.5;
                        if (score > bestScore) { bestScore = score; best = { ...c, simH, simA }; }
                    }

                    const confidence = bestScore >= 2.5 ? 'HIGH' : bestScore >= 1.5 ? 'MEDIUM' : null;
                    const note = `score=${bestScore.toFixed(2)}, home=${best.simH.toFixed(2)} "${best.home_name}", away=${best.simA.toFixed(2)} "${best.away_name}"`;

                    if (!confidence) {
                        await db.run(
                            `INSERT INTO v4.external_match_mapping
                                 (source, external_id, v4_match_id, strategy, confidence, notes)
                             VALUES ('csv', $1, NULL, 'UNMATCHED', 'NONE', $2)
                             ON CONFLICT (source, external_id) DO NOTHING`,
                            [externalId, `low score: ${note}`]
                        );
                        batchStats.unmatched++;
                        continue;
                    }

                    await db.run(
                        `INSERT INTO v4.external_match_mapping
                             (source, external_id, v4_match_id, strategy, confidence, notes)
                         VALUES ('csv', $1, $2, 'DATE_TEAMS', $3, $4)
                         ON CONFLICT (source, external_id) DO NOTHING`,
                        [externalId, best.match_id, confidence, note]
                    );

                    v4MatchId = best.match_id;
                    if (confidence === 'HIGH') batchStats.high++;
                    else batchStats.medium++;
                }

                if (!v4MatchId) continue;

                // ── match_stats ──
                const sc = scoresById[externalId];
                const at = attackById[externalId];
                const co = cornersById[externalId];

                const hasStats = sc || at || co;
                if (hasStats) {
                    const r = await db.run(
                        `INSERT INTO v4.match_stats (
                            match_id,
                            home_score_ht, away_score_ht,
                            home_poss_ft, away_poss_ft, home_poss_1h, away_poss_1h, home_poss_2h, away_poss_2h,
                            home_shots_ft, away_shots_ft, home_shots_1h, away_shots_1h, home_shots_2h, away_shots_2h,
                            home_shots_ot_ft, away_shots_ot_ft, home_shots_ot_1h, away_shots_ot_1h, home_shots_ot_2h, away_shots_ot_2h,
                            home_shots_off_ft, away_shots_off_ft, home_shots_off_1h, away_shots_off_1h, home_shots_off_2h, away_shots_off_2h,
                            home_corners_ft, away_corners_ft, home_corners_1h, away_corners_1h, home_corners_2h, away_corners_2h,
                            home_yellows_ft, away_yellows_ft, home_yellows_1h, away_yellows_1h, home_yellows_2h, away_yellows_2h
                        ) VALUES (
                            $1, $2, $3,
                            $4, $5, $6, $7, $8, $9,
                            $10, $11, $12, $13, $14, $15,
                            $16, $17, $18, $19, $20, $21,
                            $22, $23, $24, $25, $26, $27,
                            $28, $29, $30, $31, $32, $33,
                            $34, $35, $36, $37, $38, $39
                        )
                        ON CONFLICT (match_id) DO NOTHING`,
                        [
                            v4MatchId,
                            int(sc?.['1HHG']), int(sc?.['1HAG']),
                            int(at?.HBPFT), int(at?.ABPFT), int(at?.HBP1H), int(at?.ABP1H), int(at?.HBP2H), int(at?.ABP2H),
                            int(at?.HTSFT), int(at?.ATSFT), int(at?.HTS1H), int(at?.ATS1H), int(at?.HTS2H), int(at?.ATS2H),
                            int(at?.HSONFT), int(at?.ASONFT), int(at?.HSON1H), int(at?.ASON1H), int(at?.HSON2H), int(at?.ASON2H),
                            int(at?.HSOFFFT), int(at?.ASOFFFT), int(at?.HSOFF1H), int(at?.ASOFF1H), int(at?.HSOFF2H), int(at?.ASOFF2H),
                            int(co?.HCFT), int(co?.ACFT), int(co?.HC1H), int(co?.AC1H), int(co?.HC2H), int(co?.AC2H),
                            int(co?.HYCFT), int(co?.AYCFT), int(co?.HYC1H), int(co?.AYC1H), int(co?.HYC2H), int(co?.AYC2H),
                        ]
                    );
                    if ((r.changes ?? 0) > 0) batchStats.stats++;
                }

                // ── match_odds ──
                const od = oddsById[externalId];
                if (od) {
                    const r = await db.run(
                        `INSERT INTO v4.match_odds (
                            match_id,
                            odds_home, odds_draw, odds_away,
                            over_05, under_05, over_15, under_15, over_25, under_25,
                            over_35, under_35, over_45, under_45,
                            btts_yes, btts_no
                        ) VALUES (
                            $1, $2, $3, $4,
                            $5, $6, $7, $8, $9, $10,
                            $11, $12, $13, $14,
                            $15, $16
                        )
                        ON CONFLICT (match_id) DO NOTHING`,
                        [
                            v4MatchId,
                            float(od.H), float(od.D), float(od.A),
                            float(od.O05), float(od.U05), float(od.O15), float(od.U15),
                            float(od.O25), float(od.U25), float(od.O35), float(od.U35),
                            float(od.O45), float(od.U45),
                            float(od.BTTSY), float(od.BTTSN),
                        ]
                    );
                    if ((r.changes ?? 0) > 0) batchStats.odds++;
                }
            }

            const total = batchStats.high + batchStats.medium + batchStats.unmatched;
            const pct = total > 0 ? ((batchStats.high + batchStats.medium) / total * 100).toFixed(1) : 'n/a';
            logger.info({
                comp: csvCompName, suffix,
                high: batchStats.high, medium: batchStats.medium, unmatched: batchStats.unmatched,
                coverage_pct: pct,
                stats_inserted: batchStats.stats, odds_inserted: batchStats.odds,
            }, 'Batch done');

            overallStats.mapped_high   += batchStats.high;
            overallStats.mapped_medium += batchStats.medium;
            overallStats.unmatched     += batchStats.unmatched;
            overallStats.stats_inserted+= batchStats.stats;
            overallStats.odds_inserted += batchStats.odds;
        }
    }

    logger.info(overallStats, '=== CSV IMPORT REPORT ===');
    process.exit(0);
}

main().catch(err => {
    logger.error({ err }, 'Fatal error in import_csv_data');
    process.exit(1);
});
