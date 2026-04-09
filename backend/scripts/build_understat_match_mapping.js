/**
 * build_understat_match_mapping.js
 *
 * Populates v4.external_match_mapping (source='understat') by linking
 * UnderStat match records to v4.matches using:
 *   date + competition (via known league_key mapping) + team names (pg_trgm)
 *
 * UnderStat files (all_matches.json):
 *   - understat_epl_all_matches.json       → Premier League
 *   - understat_laliga_all_matches.json    → LaLiga
 *   - understat_bundesliga_all_matches.json→ Bundesliga
 *   - understat_seriea_all_matches.json    → Serie A
 *   - understat_ligue1_all_matches.json    → Ligue 1
 *   - understat_rfpl_all_matches.json      → Russian Premier League (skip if no v4 comp)
 *
 * Matching:
 *   1. Filter v4.matches by competition_id + match_date
 *   2. Score candidates: sim_home×1.5 + sim_away×1.5 → confidence HIGH≥2.5 / MEDIUM≥1.5
 *
 * Idempotent: ON CONFLICT (source, external_id) DO NOTHING
 *
 * Usage:
 *   docker compose exec backend node scripts/build_understat_match_mapping.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/config/database.js';
import { createChildLogger } from '../src/utils/logger.js';

const logger = createChildLogger('UnderstatMapping');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UNDERSTAT_DIR = process.env.UNDERSTAT_DIR ?? path.resolve(__dirname, '../../UnderStat/understat');
// In Docker: mounted at /data/understat/understat
const NAME_THRESHOLD = 0.15;

// UnderStat file key → v4 competition name (for lookup via v4.competitions.name)
const LEAGUE_FILES = [
    { file: 'understat_epl_all_matches.json',        leagueKey: 'epl',        compName: 'Premier League' },
    { file: 'understat_laliga_all_matches.json',      leagueKey: 'la_liga',    compName: 'LaLiga' },
    { file: 'understat_bundesliga_all_matches.json',  leagueKey: 'bundesliga', compName: 'Bundesliga' },
    { file: 'understat_seriea_all_matches.json',      leagueKey: 'serie_a',    compName: 'Serie A' },
    { file: 'understat_ligue1_all_matches.json',      leagueKey: 'ligue_1',    compName: 'Ligue 1' },
    { file: 'understat_rfpl_all_matches.json',        leagueKey: 'rfpl',       compName: null }, // skip — RFPL not in v4
];

async function main() {
    await db.init();
    logger.info('Starting UnderStat → v4.matches mapping...');

    const globalStats = { total: 0, high: 0, medium: 0, unmatched: 0, no_comp: 0 };

    for (const league of LEAGUE_FILES) {
        const filePath = path.join(UNDERSTAT_DIR, league.file);

        if (!fs.existsSync(filePath)) {
            logger.warn({ file: league.file }, 'File not found — skipping');
            continue;
        }

        // Resolve v4 competition_id
        let competitionId = null;
        if (league.compName) {
            const comp = await db.get(
                `SELECT competition_id FROM v4.competitions WHERE name = $1 LIMIT 1`,
                [league.compName]
            );
            if (!comp) {
                logger.warn({ compName: league.compName }, 'No v4 competition found — skipping league');
                continue;
            }
            competitionId = comp.competition_id;
        }

        if (!competitionId) {
            logger.info({ league: league.leagueKey }, 'No competition mapping — skipping');
            globalStats.no_comp++;
            continue;
        }

        // Load JSON
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        const matches = data.matches ?? data;

        logger.info({ league: league.leagueKey, total: matches.length, comp: league.compName }, 'Processing league');

        const stats = { high: 0, medium: 0, unmatched: 0 };

        for (const m of matches) {
            if (!m.is_result && !m.home_xg) continue; // skip unplayed future matches

            const matchDate = m.date; // "YYYY-MM-DD"
            const externalId = String(m.match_id);

            // Check already mapped
            const existing = await db.get(
                `SELECT id FROM v4.external_match_mapping WHERE source = 'understat' AND external_id = $1`,
                [externalId]
            );
            if (existing) continue;

            // Candidates in this competition on this date
            const candidates = await db.all(
                `SELECT
                    m.match_id,
                    hc.name AS home_name,
                    ac.name AS away_name,
                    similarity(hc.name, $1) AS sim_home_full,
                    similarity(ac.name, $2) AS sim_away_full,
                    word_similarity($1, hc.name) AS wsim_home,
                    word_similarity($2, ac.name) AS wsim_away
                FROM v4.matches m
                JOIN v4.clubs hc ON hc.club_id = m.home_club_id
                JOIN v4.clubs ac ON ac.club_id = m.away_club_id
                WHERE m.competition_id = $3
                  AND m.match_date     = $4::DATE
                  AND (similarity(hc.name, $1) > $5 OR word_similarity($1, hc.name) > $5)
                  AND (similarity(ac.name, $2) > $5 OR word_similarity($2, ac.name) > $5)`,
                [m.home_team, m.away_team, competitionId, matchDate, NAME_THRESHOLD]
            );

            if (candidates.length === 0) {
                await db.run(
                    `INSERT INTO v4.external_match_mapping
                         (source, external_id, v4_match_id, strategy, confidence, notes)
                     VALUES ('understat', $1, NULL, 'UNMATCHED', 'NONE', $2)
                     ON CONFLICT (source, external_id) DO NOTHING`,
                    [externalId, `no candidate on ${matchDate} for ${m.home_team} vs ${m.away_team} in ${league.compName}`]
                );
                stats.unmatched++;
                continue;
            }

            // Score candidates
            let best = null, bestScore = -1;
            for (const c of candidates) {
                const simH = Math.max(parseFloat(c.sim_home_full), parseFloat(c.wsim_home));
                const simA = Math.max(parseFloat(c.sim_away_full), parseFloat(c.wsim_away));
                const score = simH * 1.5 + simA * 1.5;
                if (score > bestScore) { bestScore = score; best = { ...c, score, simH, simA }; }
            }

            // HIGH ≥ 2.5 (both names ≥ 0.83), MEDIUM ≥ 1.5
            const confidence = bestScore >= 2.5 ? 'HIGH' : bestScore >= 1.5 ? 'MEDIUM' : null;
            const note = `score=${bestScore.toFixed(2)}, home=${best.simH.toFixed(2)} "${best.home_name}", away=${best.simA.toFixed(2)} "${best.away_name}"`;

            if (!confidence) {
                await db.run(
                    `INSERT INTO v4.external_match_mapping
                         (source, external_id, v4_match_id, strategy, confidence, notes)
                     VALUES ('understat', $1, NULL, 'UNMATCHED', 'NONE', $2)
                     ON CONFLICT (source, external_id) DO NOTHING`,
                    [externalId, `low score: ${note}`]
                );
                stats.unmatched++;
                continue;
            }

            await db.run(
                `INSERT INTO v4.external_match_mapping
                     (source, external_id, v4_match_id, strategy, confidence, notes)
                 VALUES ('understat', $1, $2, 'DATE_TEAMS', $3, $4)
                 ON CONFLICT (source, external_id) DO NOTHING`,
                [externalId, best.match_id, confidence, note]
            );

            if (confidence === 'HIGH') stats.high++;
            else stats.medium++;
        }

        const total = stats.high + stats.medium + stats.unmatched;
        const pct = total > 0 ? ((stats.high + stats.medium) / total * 100).toFixed(1) : '0.0';
        logger.info({
            league: league.leagueKey,
            total,
            high: stats.high,
            medium: stats.medium,
            unmatched: stats.unmatched,
            coverage_pct: pct,
        }, `League mapping done`);

        globalStats.total    += total;
        globalStats.high     += stats.high;
        globalStats.medium   += stats.medium;
        globalStats.unmatched+= stats.unmatched;
    }

    const totalMapped = globalStats.high + globalStats.medium;
    const pct = globalStats.total > 0 ? (totalMapped / globalStats.total * 100).toFixed(1) : '0.0';
    logger.info({ ...globalStats, coverage_pct: pct }, '=== UNDERSTAT MAPPING REPORT ===');

    if (parseFloat(pct) < 70) {
        logger.warn('Coverage < 70% — review unmatched before importing xG');
    } else {
        logger.info('Coverage sufficient. Proceed with import_understat_xg.js');
    }

    process.exit(0);
}

main().catch(err => {
    logger.error({ err }, 'Fatal error in build_understat_match_mapping');
    process.exit(1);
});
