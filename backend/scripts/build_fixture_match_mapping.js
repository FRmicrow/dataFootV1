/**
 * build_fixture_match_mapping.js
 *
 * Populates v4.fixture_match_mapping by linking V3 fixtures (with odds or xG)
 * to v4.matches, using the pre-built mapping tables:
 *   - v4.country_mapping  : public.v3_countries ↔ v4.countries (via ISO code)
 *   - v4.league_mapping   : public.v3_leagues   ↔ v4.competitions (name + type + rank)
 *
 * Matching per fixture — candidates are pre-filtered to the right competition:
 *   1. EXACT_TM_ID       — V3_Fixtures.tm_match_id = v4.matches.source_match_id
 *   2. MULTI_FIELD_SCORE — date (exact) + season + matchday + score + home/away teams
 *      Confidence:
 *        HIGH   → score >= 4.0
 *        MEDIUM → score >= 2.5
 *        LOW    → score >= 1.5
 *      UNMATCHED if no candidate, or country/league not in mapping tables.
 *
 * Idempotent: ON CONFLICT (v3_fixture_id) DO NOTHING.
 *
 * Usage:
 *   docker compose exec backend node scripts/build_fixture_match_mapping.js
 */

import 'dotenv/config';
import db from '../src/config/database.js';
import { createChildLogger } from '../src/utils/logger.js';

const logger = createChildLogger('FixtureMappingScript');

const NAME_MIN_THRESHOLD = 0.15;

// Extract matchday integer from V3 round strings:
//   "Regular Season - 30" → 30
//   "Journée - 25"        → 25
//   "J30"                 → 30
function extractMatchday(round) {
    if (!round) return null;
    const m = round.match(/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) : null;
}

async function main() {
    await db.init();
    logger.info('Starting fixture → match mapping build (via country/league mapping tables)...');

    // Fetch all V3 fixtures with odds OR xG, not yet mapped
    const fixtures = await db.all(`
        SELECT DISTINCT
            vf.fixture_id,
            vf.tm_match_id,
            vf.date::DATE           AS match_date,
            vf.season_year,
            vf.season_year || '-' || (vf.season_year + 1) AS season_label,
            vf.round,
            vf.goals_home,
            vf.goals_away,
            ht.name                 AS home_name,
            at2.name                AS away_name,
            -- Resolved V4 competition via league_mapping
            lm.v4_competition_id,
            lm.v4_name              AS v4_competition_name,
            lm.confidence           AS league_map_confidence
        FROM v3_fixtures vf
        INNER JOIN v3_teams   ht  ON ht.team_id    = vf.home_team_id
        INNER JOIN v3_teams   at2 ON at2.team_id   = vf.away_team_id
        INNER JOIN v3_leagues vl  ON vl.league_id  = vf.league_id
        -- Only fixtures with odds or xG
        LEFT JOIN v3_odds vo ON vo.fixture_id = vf.fixture_id
        -- Link to league_mapping (country already embedded in league_mapping)
        LEFT JOIN v4.league_mapping lm ON lm.v3_league_id = vf.league_id
        WHERE (vo.fixture_id IS NOT NULL OR vf.xg_home IS NOT NULL OR vf.xg_away IS NOT NULL)
          AND vf.fixture_id NOT IN (
              SELECT v3_fixture_id FROM v4.fixture_match_mapping
          )
        ORDER BY vf.fixture_id
    `);

    logger.info({ total: fixtures.length }, 'Fixtures to process');

    const stats = { exact: 0, high: 0, medium: 0, low: 0, unmatched: 0, no_league_map: 0 };

    for (const fixture of fixtures) {

        // --- No league mapping → UNMATCHED immediately ---
        if (!fixture.v4_competition_id) {
            await insertUnmatched(db, fixture,
                `no v4.league_mapping entry (league_id=${fixture.v3_league_id ?? 'unknown'})`
            );
            stats.no_league_map++;
            stats.unmatched++;
            continue;
        }

        // --- Strategy 1: EXACT via tm_match_id ---
        if (fixture.tm_match_id) {
            const v4Match = await db.get(
                `SELECT match_id FROM v4.matches
                 WHERE source_match_id = $1
                   AND competition_id  = $2`,
                [String(fixture.tm_match_id), fixture.v4_competition_id]
            );
            if (v4Match) {
                await db.run(
                    `INSERT INTO v4.fixture_match_mapping
                         (v3_fixture_id, v4_match_id, strategy, confidence)
                     VALUES ($1, $2, 'EXACT_TM_ID', 'HIGH')
                     ON CONFLICT (v3_fixture_id) DO NOTHING`,
                    [fixture.fixture_id, v4Match.match_id]
                );
                stats.exact++;
                continue;
            }
        }

        if (!fixture.match_date) {
            await insertUnmatched(db, fixture, 'no match_date');
            stats.unmatched++;
            continue;
        }

        const v3Matchday = extractMatchday(fixture.round);

        // Season labels to try: "2025-2026", "2025", "2024-2025"
        const seasonLabels = [
            fixture.season_label,
            String(fixture.season_year),
            `${fixture.season_year - 1}-${fixture.season_year}`,
        ];

        // --- Strategy 2: Multi-field score within the resolved V4 competition ---
        // Normalize match_date: pg driver returns JS Date objects in local timezone.
        // Use toISOString() to get UTC-based YYYY-MM-DD, avoiding DST day-shift bugs.
        const matchDateStr = fixture.match_date instanceof Date
            ? fixture.match_date.toISOString().slice(0, 10)
            : String(fixture.match_date).slice(0, 10);

        const candidates = await db.all(
            `SELECT
                m.match_id,
                m.home_score,
                m.away_score,
                m.season_label        AS v4_season,
                m.matchday            AS v4_matchday,
                hc.name               AS home_name,
                ac.name               AS away_name,
                similarity(hc.name,  $1) AS sim_home_full,
                similarity(ac.name,  $2) AS sim_away_full,
                word_similarity($1, hc.name) AS wsim_home,
                word_similarity($2, ac.name) AS wsim_away
            FROM v4.matches m
            JOIN v4.clubs hc ON hc.club_id = m.home_club_id
            JOIN v4.clubs ac ON ac.club_id = m.away_club_id
            WHERE m.competition_id = $3
              AND m.match_date     = $4::DATE
              AND (
                  similarity(hc.name, $1) > $5
                  OR word_similarity($1, hc.name) > $5
              )
              AND (
                  similarity(ac.name, $2) > $5
                  OR word_similarity($2, ac.name) > $5
              )`,
            [
                fixture.home_name,
                fixture.away_name,
                fixture.v4_competition_id,
                matchDateStr,
                NAME_MIN_THRESHOLD,
            ]
        );

        if (candidates.length === 0) {
            await insertUnmatched(db, fixture,
                `no v4 candidate in competition ${fixture.v4_competition_name} on ${fixture.match_date}`
            );
            stats.unmatched++;
            continue;
        }

        // Score each candidate
        let best = null;
        let bestScore = -1;

        for (const c of candidates) {
            let score = 0;
            const d = {};

            // Team names — best of full similarity vs word_similarity
            const simHome = Math.max(parseFloat(c.sim_home_full), parseFloat(c.wsim_home));
            const simAway = Math.max(parseFloat(c.sim_away_full), parseFloat(c.wsim_away));
            d.sim_home = simHome.toFixed(2);
            d.sim_away = simAway.toFixed(2);
            score += simHome * 1.5;
            score += simAway * 1.5;

            // Season
            const seasonMatch = seasonLabels.includes(c.v4_season);
            d.season = seasonMatch;
            if (seasonMatch) score += 0.5;

            // Matchday
            const matchdayMatch = v3Matchday !== null && c.v4_matchday !== null
                && v3Matchday === c.v4_matchday;
            d.matchday = matchdayMatch;
            if (matchdayMatch) score += 0.5;

            // Final score
            const scoreMatch =
                fixture.goals_home != null && fixture.goals_away != null &&
                c.home_score != null && c.away_score != null &&
                Number(fixture.goals_home) === Number(c.home_score) &&
                Number(fixture.goals_away) === Number(c.away_score);
            d.score_match = fixture.goals_home != null ? scoreMatch : null;
            if (scoreMatch) score += 1.0;

            if (score > bestScore) {
                bestScore = score;
                best = { ...c, score, d };
            }
        }

        const confidence =
            bestScore >= 4.0 ? 'HIGH' :
            bestScore >= 2.5 ? 'MEDIUM' :
            bestScore >= 1.5 ? 'LOW' : null;

        const note = `score=${bestScore.toFixed(2)}, sim_home=${best.d.sim_home}, sim_away=${best.d.sim_away}, season=${best.d.season}, matchday=${best.d.matchday}, score_match=${best.d.score_match ?? 'n/a'}, competition=${fixture.v4_competition_name}`;

        if (!confidence) {
            await insertUnmatched(db, fixture, `best_score=${bestScore.toFixed(2)} below LOW — ${note}`);
            stats.unmatched++;
            continue;
        }

        await db.run(
            `INSERT INTO v4.fixture_match_mapping
                 (v3_fixture_id, v4_match_id, strategy, confidence, notes)
             VALUES ($1, $2, 'MULTI_FIELD_SCORE', $3, $4)
             ON CONFLICT (v3_fixture_id) DO NOTHING`,
            [fixture.fixture_id, best.match_id, confidence, note]
        );

        if (confidence === 'HIGH')        stats.high++;
        else if (confidence === 'MEDIUM') stats.medium++;
        else                              stats.low++;
    }

    // Summary
    const totalMapped = stats.exact + stats.high + stats.medium + stats.low;
    const totalHigh   = stats.exact + stats.high;
    const pct = (n) => fixtures.length > 0
        ? ((n / fixtures.length) * 100).toFixed(1) : '0.0';

    logger.info({
        total:            fixtures.length,
        exact_high:       stats.exact,
        multi_high:       stats.high,
        medium:           stats.medium,
        low:              stats.low,
        no_league_map:    stats.no_league_map,
        unmatched:        stats.unmatched,
        coverage_pct:     pct(totalMapped),
        high_conf_pct:    pct(totalHigh),
    }, '=== MAPPING REPORT ===');

    if (parseFloat(pct(totalHigh)) < 50) {
        logger.warn({ high_conf_pct: pct(totalHigh) },
            'WARNING: Less than 50% HIGH confidence. Review before migration.');
    } else {
        logger.info('Coverage sufficient. Proceed with migrate_odds_v3_to_v4.js');
    }

    process.exit(0);
}

async function insertUnmatched(db, fixture, reason) {
    await db.run(
        `INSERT INTO v4.fixture_match_mapping
             (v3_fixture_id, v4_match_id, strategy, confidence, notes)
         VALUES ($1, NULL, 'UNMATCHED', 'NONE', $2)
         ON CONFLICT (v3_fixture_id) DO NOTHING`,
        [fixture.fixture_id, reason]
    );
}

main().catch(err => {
    logger.error({ err }, 'Fatal error in build_fixture_match_mapping');
    process.exit(1);
});
