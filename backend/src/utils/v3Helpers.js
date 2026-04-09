/**
 * StatFoot V3 Backend Helpers
 * Centralizing common logic for controllers and services to reduce duplication.
 */

/**
 * Standardize numeric inputs from request params/query.
 */
export const cleanInt = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return null;
    const parsed = Number.parseInt(val, 10);
    return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Common response mapper for V3 Import Matrix.
 */
export const mapMatrixRow = (row, statusIndex) => {
    const key = `${row.league_id}_${row.season_year}`;
    const statuses = statusIndex[key] || {};
    return {
        league_id: row.league_id,
        league_name: row.league_name,
        league_logo: row.league_logo,
        season_year: row.season_year,
        is_current: row.is_current,
        importance_rank: row.league_importance_rank || 99,
        country_importance: row.country_importance_rank || 99,
        pillars: {
            core: statuses.core || { status: 0 },
            events: statuses.events || { status: 0 },
            lineups: statuses.lineups || { status: 0 },
            trophies: statuses.trophies || { status: 0 },
            fs: statuses.fs || { status: 0 },
            ps: statuses.ps || { status: 0 }
        }
    };
};

/**
 * Build a consistent status index for matrix operations.
 */
export const buildStatusIndex = (statuses) => {
    const index = {};
    for (const s of statuses) {
        const key = `${s.league_id}_${s.season_year}`;
        if (!index[key]) index[key] = {};
        index[key][s.pillar] = {
            status: s.status,
            last_checked: s.last_checked_at,
            failure_reason: s.failure_reason,
            total: s.total_items_expected,
            imported: s.total_items_imported,
            start: s.data_range_start,
            end: s.data_range_end
        };
    }
    return index;
};

/**
 * Normalizes probability values (45% -> 0.45 or 0.45 -> 0.45)
 */
export const parseProbability = (p) => {
    if (p === null || p === undefined) return 0;
    if (typeof p === 'number') return p;
    if (typeof p === 'string') {
        if (p.includes('%')) return (Number.parseFloat(p) || 0) / 100;
        return Number.parseFloat(p) || 0;
    }
    return 0;
};

/**
 * Maps API-Football odds structure to the simplified V3 format
 */
export const mapLiveOdds = (oddsData) => {
    if (!oddsData || !oddsData.bookmakers?.length) return null;
    const PREFERRED_IDS = [52, 11]; // Winamax, Unibet
    const bookmaker = oddsData.bookmakers.find(b => PREFERRED_IDS.includes(b.id)) || oddsData.bookmakers[0];
    const getOdd = (arr, betId, value) => arr.find(b => b.id === betId)?.values.find(v => v.value === value)?.odd;

    return {
        match_winner: {
            home: getOdd(bookmaker.bets, 1, "Home"),
            draw: getOdd(bookmaker.bets, 1, "Draw"),
            away: getOdd(bookmaker.bets, 1, "Away")
        },
        goals_ou25: {
            over: getOdd(bookmaker.bets, 5, "Over 2.5"),
            under: getOdd(bookmaker.bets, 5, "Under 2.5")
        }
    };
};

export default {
    cleanInt,
    mapMatrixRow,
    buildStatusIndex,
    parseProbability,
    mapLiveOdds
};
