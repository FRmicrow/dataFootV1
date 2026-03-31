/**
 * Universal Multi-League Team Resolver (v2)
 *
 * Resolves a raw Transfermarkt team name to its canonical V3_Teams.team_id.
 *
 * Resolution pipeline (ordered by speed / reliability):
 *   1. Protected in-memory whitelist (per country)  — O(1), never wrong
 *   2. In-process runtime cache                     — O(1), avoids DB round-trips
 *   3. V3_Team_Aliases lookup (DB, case-insensitive) — persistent alias map
 *   4. V3_Teams exact name match (DB)               — fallback exact match
 *   5. V3_Teams fuzzy match (Levenshtein ≥ 0.80)   — near-miss detection
 *   6. AUTO-CREATE + write alias                    — last resort, fully tracked
 *
 * Key improvements over team_resolver.js (v1):
 *   - Supports all 5 major leagues + cups
 *   - Alias lookups are DB-persisted (survives restarts, prevents ghost teams)
 *   - Fuzzy matching prevents creating "Nürnberg" and "FC Nürnberg" as two teams
 *   - All auto-created teams and aliases are tagged source='tm_auto'
 */

import logger from '../../src/utils/logger.js';

const log = logger.child({ module: 'team_resolver_multi' });

// ─────────────────────────────────────────────────────────────
// NOISE + REGIONAL FILTERS
// ─────────────────────────────────────────────────────────────

const NOISE_WORDS = new Set([
    // Generic prefixes / suffixes (FR)
    'aj', 'as', 'fc', 'rc', 'losc', 'olympique', 'de', 'stade', 'foot', 'union',
    'club', 'ogc', 'us', 'sc', 'ac', 'es', 'so', 'sm', 'ea', 'cs', 'estac', 'fca', 'af',
    // German
    'bv', 'sv', 'vfb', 'vfl', 'tsg', 'rb', 'ssv', 'bayer', 'fsv', 'sg', 'msv', '1', 'sc',
    // Spanish
    'cd', 'sd', 'real', 'atletico', 'deportivo', 'cf', 'ud', 'rcd', 'ce',
    // English
    'city', 'united', 'town', 'county', 'rovers', 'wanderers', 'athletic', 'albion',
    // Italian
    'ss', 'calcio', 'inter', 'hellas',
    // Common
    'the',
]);

const REGIONAL_SUFFIXES = [
    'herault','alsace','ardennes','lorraine','atlantique','provence','anjou','berry',
    'villedieu','de la garenne','atlantique','du maine','du var','du rhone','du gard',
    'ouest provence','cote d opale',
];

// ─────────────────────────────────────────────────────────────
// PROTECTED WHITELISTS — No longer used in v2 (all moved to DB aliases)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// NORMALIZATION
// ─────────────────────────────────────────────────────────────

/**
 * Normalize a team name to a minimal token set for comparison.
 * Strips accents, noise words, numbers, punctuation and casing.
 */
export function normalizeTeam(name) {
    if (!name) return '';
    // Remove metadata markers added by our own scripts
    let c = name
        .replace(/\(Merged.*?\)/gi, '')
        .replace(/\(Auto-Merged.*?\)/gi, '')
        .replace(/\(Retired\)/gi, '')
        .trim();

    // Unicode normalize (decompose accents) then strip combining chars
    c = c
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // strip accents
        .replace(/[.,'`´]/g, '')           // strip punctuation
        .replace(/[-_]/g, ' ')             // dashes → spaces
        .replace(/\s+/g, ' ')
        .trim();

    // Strip noise words & pure digit tokens
    const tokens = c.split(' ').filter(t => t && !NOISE_WORDS.has(t) && !/^\d+$/.test(t));

    // Strip regional suffixes from the end
    let result = tokens.join(' ');
    for (const suffix of REGIONAL_SUFFIXES) {
        if (result.endsWith(' ' + suffix)) {
            result = result.slice(0, -(suffix.length + 1)).trim();
        }
    }
    return result;
}

// ─────────────────────────────────────────────────────────────
// FUZZY SIMILARITY (Levenshtein — pure JS, no external deps)
// ─────────────────────────────────────────────────────────────

function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => i === 0
        ? Array.from({ length: n + 1 }, (_, j) => j)
        : [i, ...Array(n).fill(0)]);
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Returns a similarity score between 0 and 1.
 * Score ≥ 0.80 is considered a match.
 */
function similarity(a, b) {
    if (!a || !b) return 0;
    const dist = levenshtein(a, b);
    return 1 - dist / Math.max(a.length, b.length);
}

const FUZZY_THRESHOLD = 0.80;

// ─────────────────────────────────────────────────────────────
// RUNTIME CACHE (process lifetime)
// ─────────────────────────────────────────────────────────────

const resolutionCache = new Map(); // cacheKey → team_id

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Resolve a raw Transfermarkt team name to its canonical V3_Teams.team_id.
 *
 * @param {string}  teamName  Raw name from JSON (e.g. "AJ Auxerre")
 * @param {object}  db        The project's db client
 * @param {Array}   teamsCache  In-memory dump of V3_Teams rows for this run
 * @param {number}  countryId   Canonical country_id from V3_Countries
 * @returns {number|null}  team_id or null on unresolvable failure
 */
export async function resolveTeamId(teamName, db, teamsCache, countryId = 1) {
    if (!teamName) return null;

    const cacheKey = `${countryId}:${teamName}`;
    if (resolutionCache.has(cacheKey)) return resolutionCache.get(cacheKey);

    const norm = normalizeTeam(teamName);

    // ── Step 1: In-process cache (teamsCache) ─────────────────
    const cacheMatch = teamsCache.find(t => normalizeTeam(t.name) === norm);
    if (cacheMatch) {
        resolutionCache.set(cacheKey, cacheMatch.team_id);
        return cacheMatch.team_id;
    }

    // ── Step 2: V3_Team_Aliases lookup (DB) ───────────────────
    const aliasMatch = await db.get(
        `SELECT team_id FROM V3_Team_Aliases WHERE lower(alias_name) = lower($1) LIMIT 1`,
        [teamName]
    );
    if (aliasMatch) {
        resolutionCache.set(cacheKey, aliasMatch.team_id);
        return aliasMatch.team_id;
    }

    // Also try with normalized alias_name
    const aliasNormMatch = await db.get(
        `SELECT ta.team_id FROM V3_Team_Aliases ta
         WHERE lower(ta.alias_name) = lower($1) LIMIT 1`,
        [norm]
    );
    if (aliasNormMatch) {
        resolutionCache.set(cacheKey, aliasNormMatch.team_id);
        return aliasNormMatch.team_id;
    }

    // ── Step 3: Exact DB match on name (scoped by country) ────
    const exactMatch = await db.get(
        `SELECT team_id, name FROM V3_Teams
         WHERE lower(name) = lower($1) AND (country_id = $2 OR country_id IS NULL)
         LIMIT 1`,
        [teamName, countryId]
    );
    if (exactMatch) {
        // Write alias for future runs
        await _writeAlias(db, teamName, exactMatch.team_id, 'tm_exact');
        resolutionCache.set(cacheKey, exactMatch.team_id);
        teamsCache.push({ team_id: exactMatch.team_id, name: exactMatch.name });
        return exactMatch.team_id;
    }

    // ── Step 4: Fuzzy match against DB teams (country-filtered) ──
    const candidates = await db.all(
        `SELECT team_id, name FROM V3_Teams
         WHERE (country_id = $1 OR country_id IS NULL)
           AND data_source != 'retired'
         LIMIT 1000`,
        [countryId]
    );

    let bestId = null, bestScore = 0, bestName = '';
    for (const row of candidates) {
        const score = similarity(norm, normalizeTeam(row.name));
        if (score > bestScore && score >= FUZZY_THRESHOLD) {
            bestScore = score;
            bestId = row.team_id;
            bestName = row.name;
        }
    }

    if (bestId) {
        log.info({ teamName, bestName, bestScore, countryId }, 'Fuzzy match resolved');
        await _writeAlias(db, teamName, bestId, 'tm_fuzzy');
        resolutionCache.set(cacheKey, bestId);
        teamsCache.push({ team_id: bestId, name: bestName });
        return bestId;
    }

    // ── Step 4.5: Global Fallback (Asset Recovery) ───────────
    // If no match in country, search globally to "adopt" existing API teams with logos.
    const globalCandidates = await db.all(
        `SELECT team_id, name, country_id, logo_url FROM V3_Teams
         WHERE data_source != 'retired'
           AND (country_id IS NULL OR country_id != $1)
         LIMIT 1000`,
        [countryId]
    );

    let globalId = null, globalScore = 0, globalName = '';
    for (const row of globalCandidates) {
        const score = similarity(norm, normalizeTeam(row.name));
        if (score > globalScore && score >= FUZZY_THRESHOLD) {
            globalScore = score;
            globalId = row.team_id;
            globalName = row.name;
        }
    }

    if (globalId && globalScore >= 0.90) {
        log.info({ teamName, globalName, globalScore, countryId }, 'Global asset adoption (logo recovery)');
        
        // Update the team to belong to this country if it had no country
        await db.run(
            `UPDATE V3_Teams SET country_id = $1 WHERE team_id = $2 AND country_id IS NULL`,
            [countryId, globalId]
        );
        
        await _writeAlias(db, teamName, globalId, 'tm_adopted');
        resolutionCache.set(cacheKey, globalId);
        teamsCache.push({ team_id: globalId, name: globalName });
        return globalId;
    }

    // ── Step 5: Auto-create + alias write ────────────────────
    const beautified = teamName
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

    log.warn({ teamName: beautified, norm, countryId }, 'Auto-creating missing team');

    const res = await db.run(
        `INSERT INTO V3_Teams (name, country_id, national, data_source)
         VALUES ($1, $2, $3, $4)
         RETURNING team_id`,
        [beautified, countryId, 0, 'tm_auto']
    );

    const newId = res?.rows?.[0]?.team_id ?? res.lastInsertRowid;
    if (!newId) {
        log.error({ teamName }, 'Failed to auto-create team');
        return null;
    }

    await _writeAlias(db, teamName, newId, 'tm_auto');
    resolutionCache.set(cacheKey, newId);
    teamsCache.push({ team_id: newId, name: beautified });
    return newId;
}

/**
 * Persist a team name → ID alias in V3_Team_Aliases.
 * Silently ignores duplicate-key conflicts (alias already mapped).
 */
async function _writeAlias(db, alias, teamId, dataSource) {
    try {
        await db.run(
            `INSERT INTO V3_Team_Aliases (team_id, alias_name, data_source)
             VALUES ($1, $2, $3)
             ON CONFLICT (lower(alias_name)) DO NOTHING`,
            [teamId, alias, dataSource]
        );
    } catch (e) {
        // Non-fatal: alias persistence is best-effort
        log.debug({ alias, teamId, err: e.message }, 'Alias write skipped');
    }
}

/**
 * Resolve a player name to a V3_Players.player_id.
 * Checks V3_Player_Aliases first, then exact name, then auto-creates.
 * Writes the alias for future lookups.
 *
 * @returns {{ player_id: number, created: boolean }}
 */
export async function resolvePlayerId(playerName, db) {
    if (!playerName?.trim()) return null;

    // 1. Alias table
    const aliasRow = await db.get(
        `SELECT player_id FROM V3_Player_Aliases WHERE lower(alias_name) = lower($1) LIMIT 1`,
        [playerName]
    );
    if (aliasRow) return { player_id: aliasRow.player_id, created: false };

    // 2. Exact name in V3_Players
    const exactRow = await db.get(
        `SELECT player_id, name FROM V3_Players WHERE lower(name) = lower($1) LIMIT 1`,
        [playerName]
    );
    if (exactRow) {
        await _writePlayerAlias(db, playerName, exactRow.player_id, 'tm_exact');
        return { player_id: exactRow.player_id, created: false };
    }

    // 3. Auto-create
    const res = await db.run(
        `INSERT INTO V3_Players (name) VALUES ($1) RETURNING player_id`,
        [playerName]
    );
    const newId = res?.rows?.[0]?.player_id ?? res.lastInsertRowid;
    if (!newId) return null;

    await _writePlayerAlias(db, playerName, newId, 'tm_auto');
    return { player_id: newId, created: true };
}

async function _writePlayerAlias(db, alias, playerId, dataSource) {
    try {
        await db.run(
            `INSERT INTO V3_Player_Aliases (player_id, alias_name, data_source)
             VALUES ($1, $2, $3)
             ON CONFLICT (lower(alias_name)) DO NOTHING`,
            [playerId, alias, dataSource]
        );
    } catch (e) {
        log.debug({ alias, playerId, err: e.message }, 'Player alias write skipped');
    }
}

/**
 * Clear the runtime cache between runs or in tests.
 */
export function clearCache() {
    resolutionCache.clear();
}
