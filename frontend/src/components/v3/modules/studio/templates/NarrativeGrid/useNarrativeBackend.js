import { useEffect, useState } from 'react';
import api from '../../../../../../services/api';
import demoData from './demo';

/**
 * NarrativeGrid v2 — backend helpers + hook.
 *
 * Pure helpers (testable without React) :
 *   - buildMatchEntry(fx, clubName)   → Match v2
 *   - countResults(matches)           → "5V-3N-2D"
 *   - averageXg(matches, side)        → number | null
 *   - buildTakeaway(matches, summary) → string narratif (jamais de stub xG)
 *
 * Hook :
 *   - useNarrativeBackend({ league, season, clubName, limit })
 *     → { data, loading, error }
 *
 * Hard rule (anti-hallucination) :
 *   - Si une donnée est absente côté API, le helper renvoie null. Aucun
 *     "stub 0.5" silencieux qui maquillerait le manque.
 */

// ─── Pure helpers ───────────────────────────────────────────────────────────

/**
 * Map an API fixture row to a v2 Match entry from clubName's perspective.
 */
export function buildMatchEntry(fx, clubName) {
    const isHome = fx.home_team === clubName;
    const opponent = isHome ? fx.away_team : fx.home_team;
    const opponent_logo = isHome ? fx.away_team_logo : fx.home_team_logo;

    const gf = isHome ? fx.goals_home : fx.goals_away;
    const ga = isHome ? fx.goals_away : fx.goals_home;

    let result = 'D';
    if (gf > ga) result = 'W';
    else if (gf < ga) result = 'L';

    // xG : null only if BOTH sides are null. Otherwise we keep what we have.
    let xg = null;
    if (fx.xg_home != null || fx.xg_away != null) {
        xg = {
            for:     isHome ? fx.xg_home : fx.xg_away,
            against: isHome ? fx.xg_away : fx.xg_home,
        };
    }

    return {
        opponent,
        opponent_logo: opponent_logo ?? undefined,
        isHome,
        result,
        score:      { for: gf, against: ga },
        xg,
        meta:       fx.competition_name,
        match_date: fx.date,
    };
}

/**
 * Count W/D/L and format as "5V-3N-2D" (FR convention : V=victoire,
 * N=nul, D=défaite).
 */
export function countResults(matches) {
    let w = 0, d = 0, l = 0;
    for (const m of matches ?? []) {
        if (m.result === 'W') w++;
        else if (m.result === 'D') d++;
        else if (m.result === 'L') l++;
    }
    return `${w}V-${d}N-${l}D`;
}

/**
 * Average xg.{side} over the matches that have xG data. Returns null
 * if no match has xG (no silent stub).
 */
export function averageXg(matches, side) {
    if (!Array.isArray(matches) || matches.length === 0) return null;
    let sum = 0;
    let n = 0;
    for (const m of matches) {
        const v = m?.xg?.[side];
        if (v == null || !Number.isFinite(v)) continue;
        sum += v;
        n += 1;
    }
    if (n === 0) return null;
    return sum / n;
}

/**
 * Build a one-line takeaway string. Always cites the record. Cites the
 * xG averages only if the summary actually has them — never invents
 * a 0.5 placeholder.
 */
export function buildTakeaway(matches, summary = {}) {
    const record = summary.record ?? countResults(matches);
    const hasXgFor     = summary.xg_for_avg != null && Number.isFinite(summary.xg_for_avg);
    const hasXgAgainst = summary.xg_against_avg != null && Number.isFinite(summary.xg_against_avg);

    if (hasXgFor && hasXgAgainst) {
        return `Bilan ${record} · xG moyen ${summary.xg_for_avg.toFixed(2)} pour / ${summary.xg_against_avg.toFixed(2)} contre.`;
    }
    return `Bilan ${record} sur la fenêtre observée.`;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {string} params.league
 * @param {string|number} params.season
 * @param {string} params.clubName
 * @param {number} [params.limit=10]
 */
export function useNarrativeBackend({ league, season, clubName, limit = 10 } = {}) {
    const [state, setState] = useState({ data: demoData, loading: false, error: null });

    useEffect(() => {
        let cancelled = false;
        if (!league || !season || !clubName) return;

        setState((s) => ({ ...s, loading: true, error: null }));

        (async () => {
            try {
                const fxResp = await api.getFixturesV4(league, season);
                const fixtures = fxResp?.data?.fixtures || fxResp?.fixtures || [];

                const clubFx = fixtures
                    .filter((fx) => fx.home_team === clubName || fx.away_team === clubName)
                    .filter((fx) => fx.goals_home != null && fx.goals_away != null)
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                    .slice(0, limit)
                    .reverse();

                const matches = clubFx.map((fx) => buildMatchEntry(fx, clubName));

                const xgFor     = averageXg(matches, 'for');
                const xgAgainst = averageXg(matches, 'against');

                const summary = {
                    record:              countResults(matches),
                    goals_for_total:     matches.reduce((s, m) => s + (m.score?.for ?? 0), 0),
                    goals_against_total: matches.reduce((s, m) => s + (m.score?.against ?? 0), 0),
                    xg_for_avg:          xgFor,
                    xg_against_avg:      xgAgainst,
                };

                const coverage = {
                    requested: limit,
                    received:  matches.length,
                    partial:   matches.length < limit,
                };

                const built = {
                    eyebrow:  `${clubName} · ${season}`,
                    headline: `${clubName} — ${matches.length} derniers matchs`,
                    subtitle: 'Récap factuel : scores et xG là où ils existent.',
                    summary,
                    coverage,
                    matches,
                    takeaway: buildTakeaway(matches, summary),
                    source:   'statFoot V4',
                };

                if (!cancelled) setState({ data: built, loading: false, error: null });
            } catch (err) {
                if (!cancelled) {
                    setState({ data: demoData, loading: false, error: err.message || 'API error' });
                }
            }
        })();

        return () => { cancelled = true; };
    }, [league, season, clubName, limit]);

    return state;
}

export default useNarrativeBackend;
