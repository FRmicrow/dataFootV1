import { normalizeTeam } from './team_resolver.js';

/**
 * Industrial SAFE Team Resolver.
 * Uses a Protected Whitelist for elite clubs and rigid token-based matching.
 */

const NOISE_WORDS = ['aj', 'as', 'fc', 'rc', 'losc', 'olympique', 'de', 'stade', 'foot', 'union', 'club', 'ogc', 'us', 'sc', 'ac', 'es', 'so', 'sm', 'ea', 'cs', 'estac', 'fca'];
const REGIONAL_SUFFIXES = [
    'herault', 'alsace', 'ardennes', 'lorraine', 'ouest provence', 'cote d opale', 'cote d opale', 
    'villedieu', 'de la garenne', 'atlantique', 'provence', 'du maine', 'du var', 'du rhone', 'du gard', 'd anjou', 'berry'
];

export function normalizeTeam(name) {
    if (!name) return '';
    let clean = name.replace(/\(Merged.*\)/i, '').replace(/\(Auto-Merged.*\)/i, '').trim();
    
    // Aggressive pattern cleaning
    let c = clean.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-]/g, ' ').trim();
    
    // 1. Strip Noise Words
    let words = c.split(' ').filter(x => !NOISE_WORDS.includes(x) && !/^\d+$/.test(x));
    
    // 2. Strip Regional Suffixes (if they are at the end)
    let finalWords = [];
    for (const w of words) {
        if (REGIONAL_SUFFIXES.includes(w)) continue;
        finalWords.push(w);
    }
    
    // 3. Re-check for common phrases like "cote d opale" nested
    let result = finalWords.join(' ');
    for (const suffix of REGIONAL_SUFFIXES) {
        if (result.endsWith(' ' + suffix)) {
            result = result.substring(0, result.length - suffix.length).trim();
        }
    }
    
    return result;
}

// 🛡️ PROTECTED CANONICAL IDs (France)
const PROTECTED_WHITELIST = {
    'bordeaux': 2, 'girondins': 2,
    'lyon': 4, 'ol': 4,
    'marseille': 5, 'om': 5,
    'montpellier': 6,
    'nantes': 7,
    'nice': 8,
    'paris': 9, 'psg': 9,
    'monaco': 11,
    'nimes': 12,
    'reims': 13,
    'rennes': 14, 'rennais': 14,
    'strasbourg': 15,
    'toulouse': 16,
    'lorient': 17,
    'brest': 18,
    'metz': 19,
    'lens': 20,
    'saint etienne': 21, 'asse': 21,
    'caen': 22,
    'nancy': 23,
    'valenciennes': 24,
    'auxerre': 25,
    'sochaux': 26,
    'guingamp': 27,
    'ajaccio': 28,
    'troyes': 30,
    'bastia': 31,
    'lille': 11504, 'losc': 11504,
    'boulogne': 1177,
    'grenoble': 1172,
    'mans': 1176,
    'sete': 18710,
    'roubaix': 18737,
    'lavallois': 20558,
    'cannes': 20531,
    'toulon': 18855,
    'matra': 18873,
    'racing': 18873
};

const resolutionCache = new Map();

export async function resolveTeamId(teamName, db, teamsCache) {
    if (!teamName) return null;
    if (resolutionCache.has(teamName)) return resolutionCache.get(teamName);

    const norm = normalizeTeam(teamName);

    // 1. Check Protected Whitelist
    for (const [key, id] of Object.entries(PROTECTED_WHITELIST)) {
        if (norm === key || norm.includes(key)) {
            // Very strict comparison to avoid "Hauts Lyonnais" matching "Lyon"
            if (norm === key || (norm === 'montpellier' && teamName.includes('Montpellier'))) {
                resolutionCache.set(teamName, id);
                return id;
            }
        }
    }

    // 2. Exact Normalized Match in Cache
    const match = teamsCache.find(t => normalizeTeam(t.name) === norm);
    if (match) {
        resolutionCache.set(teamName, match.team_id);
        return match.team_id;
    }

    // 3. Database Exact Search
    const dbMatch = await db.get("SELECT team_id, name FROM v3_teams WHERE lower(name) = lower($1) LIMIT 1", [teamName]);
    if (dbMatch) {
        resolutionCache.set(teamName, dbMatch.team_id);
        return dbMatch.team_id;
    }

    // 4. AUTO-CREATE (Beautified Name)
    const beautifiedName = teamName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    console.log(`[TeamResolver] Creating missing team: ${beautifiedName} (norm: ${norm})`);
    
    const res = await db.run(`
        INSERT INTO v3_teams (name, country, national, data_source)
        VALUES ($1, $2, $3, $4)
        RETURNING team_id
    `, [beautifiedName, 'France', 0, 'TM_Historical']);
    
    const newId = res.lastInsertRowid;
    resolutionCache.set(teamName, newId);
    teamsCache.push({ team_id: newId, name: beautifiedName });
    return newId;
}
