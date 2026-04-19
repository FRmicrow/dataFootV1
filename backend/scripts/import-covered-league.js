/**
 * import-covered-league.js
 *
 * Importe les matchs depuis les dossiers CoveredLeague (JSON Transfermarkt)
 * vers v4.matches + v4.match_events + v4.match_lineups.
 *
 * Conformité data-ingestion-standards.md :
 * - Déduplication par business key sur chaque entité
 * - Transaction par match (rollback si erreur)
 * - Upsert clubs manquants (équipes européennes/internationales)
 * - Zéro doublon garanti via WHERE NOT EXISTS
 *
 * Usage :
 *   node scripts/import-covered-league.js --competition=UCL
 *   node scripts/import-covered-league.js --competition=UEL
 *   node scripts/import-covered-league.js --competition=UCL --dry-run
 *   node scripts/import-covered-league.js --competition=UCL --since=1999-2000
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

if (!process.env.DATABASE_URL) {
    try {
        const { default: dotenv } = await import('dotenv');
        dotenv.config({ path: path.join(backendDir, '.env') });
    } catch { /* ignore */ }
}

const { default: db } = await import(`${backendDir}/src/config/database.js`);
const { default: logger } = await import(`${backendDir}/src/utils/logger.js`);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const COVERED_LEAGUE_BASE = '/Users/domp6/Downloads/CoveredLeague';

const COMPETITION_CONFIG = {
    UCL: {
        folder: 'ChampionLeagueFixtureDetail',
        dbName: 'UEFA Champions League',
        sourceKey: 'ucl-transfermarkt',
    },
    UEL: {
        folder: 'EuropaLeagueFixtureDetail',
        dbName: 'UEFA Europa League',
        sourceKey: 'uel-transfermarkt',
    },
};

// Parse args
const args = process.argv.slice(2);
const compArg = args.find(a => a.startsWith('--competition='))?.split('=')[1];
const sinceArg = args.find(a => a.startsWith('--since='))?.split('=')[1];
const isDryRun = args.includes('--dry-run');

if (!compArg || !COMPETITION_CONFIG[compArg]) {
    console.error(`Usage: node import-covered-league.js --competition=UCL|UEL [--since=YYYY-YYYY] [--dry-run]`);
    process.exit(1);
}

const config = COMPETITION_CONFIG[compArg];
logger.info({ competition: compArg, folder: config.folder, dryRun: isDryRun }, 'Starting import');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMatchId(homeTeam, awayTeam, matchDate, competitionId) {
    const raw = `${homeTeam}|${awayTeam}|${matchDate}|${competitionId}`;
    const hex = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 15);
    return BigInt(`0x${hex}`);
}

function makeEventId(matchId, eventOrder) {
    const raw = `ev_${matchId}_${eventOrder}`;
    const hex = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 15);
    return BigInt(`0x${hex}`);
}

// Parse "jeu., 17/09/2009" ou "dim., 13 juil. 1930" → "2009-09-17"
function parseDate(dateStr) {
    if (!dateStr) return null;

    // Format court: "17/09/2009"
    const shortMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (shortMatch) {
        return `${shortMatch[3]}-${shortMatch[2]}-${shortMatch[1]}`;
    }

    // Format long: "13 juil. 1930" ou "13 juillet 1930"
    const MONTHS = {
        'janv': '01', 'jan': '01', 'janvier': '01',
        'févr': '02', 'fév': '02', 'février': '02',
        'mars': '03',
        'avr': '04', 'avril': '04',
        'mai': '05',
        'juin': '06',
        'juil': '07', 'juillet': '07',
        'août': '08', 'aout': '08',
        'sept': '09', 'septembre': '09',
        'oct': '10', 'octobre': '10',
        'nov': '11', 'novembre': '11',
        'déc': '12', 'dec': '12', 'décembre': '12',
    };

    const longMatch = dateStr.match(/(\d{1,2})\s+([a-zéûèê\.]+)\s+(\d{4})/i);
    if (longMatch) {
        const day = longMatch[1].padStart(2, '0');
        const monthKey = longMatch[2].toLowerCase().replace('.', '');
        const year = longMatch[3];
        const month = MONTHS[monthKey];
        if (month) return `${year}-${month}-${day}`;
    }

    return null;
}

function getSeasonLabel(matchDate) {
    if (!matchDate) return null;
    const year = parseInt(matchDate.slice(0, 4));
    const month = parseInt(matchDate.slice(5, 7));
    const start = month >= 7 ? year : year - 1;
    return `${start}-${start + 1}`;
}

// Normalize club name for fuzzy matching
function normalize(name) {
    return (name || '').toLowerCase()
        .replace(/\bfc\b|\baf\b|\bac\b|\bsc\b|\bsk\b|\bif\b|\bik\b|\bfk\b|\bsv\b|\bvfb\b|\bvfl\b|\bbsc\b/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ---------------------------------------------------------------------------
// DB Lookups (cached)
// ---------------------------------------------------------------------------

const clubCache = new Map();

async function findOrCreateClub(name) {
    if (!name) return null;
    if (clubCache.has(name)) return clubCache.get(name);

    // 1. Exact match
    let row = await db.get(
        `SELECT club_id::text AS club_id FROM v4.clubs WHERE LOWER(name) = LOWER(?)`,
        [name]
    );
    if (row) { clubCache.set(name, row.club_id); return row.club_id; }

    // 2. Normalized contains
    const norm = normalize(name);
    const all = await db.all(`SELECT club_id::text AS club_id, name FROM v4.clubs`);
    const found = all.find(c => {
        const cn = normalize(c.name);
        return cn === norm || cn.includes(norm) || norm.includes(cn);
    });
    if (found) { clubCache.set(name, found.club_id); return found.club_id; }

    // 3. Create new club (clubs européens/nationaux inconnus)
    if (isDryRun) {
        logger.warn({ name }, '[dry-run] Would create club');
        clubCache.set(name, null);
        return null;
    }

    // Generate deterministic ID via md5 (same pattern as import_sql_v4.js)
    const idRow = await db.get(
        `SELECT ('x' || substr(md5(?), 1, 16))::bit(64)::bigint AS club_id`,
        [`club_${name}`]
    );
    const newId = idRow.club_id;
    await db.run(
        `INSERT INTO v4.clubs (club_id, name) VALUES (?, ?) ON CONFLICT (club_id) DO NOTHING`,
        [newId, name]
    );

    // Re-fetch after insert
    const newRow = await db.get(
        `SELECT club_id::text AS club_id FROM v4.clubs WHERE name = ?`,
        [name]
    );
    if (newRow) {
        logger.info({ name, club_id: newRow.club_id }, 'Created new club');
        clubCache.set(name, newRow.club_id);
        return newRow.club_id;
    }

    clubCache.set(name, null);
    return null;
}

const personCache = new Map();

async function findPerson(name) {
    if (!name) return null;
    if (personCache.has(name)) return personCache.get(name);

    const row = await db.get(
        `SELECT person_id::text AS person_id FROM v4.people WHERE full_name ILIKE ? LIMIT 1`,
        [name]
    );
    const id = row?.person_id ?? null;
    personCache.set(name, id);
    return id;
}

// ---------------------------------------------------------------------------
// Event type mapping (format Transfermarkt → v4.match_events)
// ---------------------------------------------------------------------------

function mapEvent(ev, order) {
    const type = ev.type?.toLowerCase();

    if (type === 'goal') {
        const goalType = ev.goal_type?.toLowerCase().includes('penalty') ? 'penalty'
            : ev.goal_type?.toLowerCase().includes('contre') ? 'own'
            : 'normal';
        return {
            event_type: goalType === 'own' ? 'owngoal' : 'goal',
            goal_type: goalType,
            card_type: null,
            player_name: ev.but || null,
            related_player_name: ev.passe || null,
            minute_label: ev.minute || null,
            side: ev.side || null,
            score_at_event: ev.score || null,
            event_order: order,
        };
    }

    if (type === 'card') {
        const cardType = ev.card_type === 'red' ? 'red'
            : ev.card_type === 'yellow' ? 'yellow'
            : 'yellow';
        return {
            event_type: cardType === 'red' ? 'redcard' : 'yellowcard',
            goal_type: null,
            card_type: cardType,
            player_name: ev.joueur || null,
            related_player_name: null,
            minute_label: ev.minute || null,
            side: ev.side || null,
            score_at_event: null,
            event_order: order,
        };
    }

    if (type === 'substitution') {
        return {
            event_type: 'substitution',
            goal_type: null,
            card_type: null,
            player_name: ev.joueur_out || null,
            related_player_name: ev.joueur_in || null,
            minute_label: ev.minute || null,
            side: ev.side || null,
            score_at_event: null,
            event_order: order,
        };
    }

    return null; // ignore other types
}

// ---------------------------------------------------------------------------
// Import one match file
// ---------------------------------------------------------------------------

async function importMatch(filePath, competitionId, seasonLabel, counters) {
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        counters.skipped++;
        return;
    }

    const { scorebox, events = [], lineups, _parser } = raw;
    if (!scorebox?.home_team || !scorebox?.away_team) { counters.skipped++; return; }
    if (scorebox.home_goals == null || scorebox.away_goals == null) { counters.skipped++; return; }

    const matchDate = parseDate(_parser?.date);
    if (!matchDate) {
        logger.warn({ file: path.basename(filePath), date: _parser?.date }, 'Unparseable date — skipping');
        counters.skipped++;
        return;
    }

    if (isDryRun) {
        logger.info({ home: scorebox.home_team, away: scorebox.away_team, date: matchDate }, '[dry-run] Would import');
        counters.updated++;
        return;
    }

    const homeClubId = await findOrCreateClub(scorebox.home_team);
    const awayClubId = await findOrCreateClub(scorebox.away_team);

    if (!homeClubId || !awayClubId) {
        logger.warn({ home: scorebox.home_team, away: scorebox.away_team }, 'Club(s) not resolved — skipping');
        counters.skipped++;
        return;
    }

    const matchId = makeMatchId(scorebox.home_team, scorebox.away_team, matchDate, competitionId);

    // Transaction par match
    let client;
    try {
        client = await db.db.connect();
        await client.query('BEGIN');

        // 1. Upsert match (business key: home_club_id, away_club_id, competition_id, match_date)
        const existing = await client.query(
            `SELECT match_id FROM v4.matches
             WHERE home_club_id = $1 AND away_club_id = $2 AND competition_id = $3 AND match_date = $4`,
            [homeClubId, awayClubId, competitionId, matchDate]
        );

        let finalMatchId;
        if (existing.rows.length > 0) {
            finalMatchId = existing.rows[0].match_id;
            // Mise à jour si score manquant
            await client.query(
                `UPDATE v4.matches SET home_score = $1, away_score = $2,
                 home_formation = COALESCE(home_formation, $3),
                 away_formation = COALESCE(away_formation, $4)
                 WHERE match_id = $5 AND home_score IS NULL`,
                [scorebox.home_goals, scorebox.away_goals,
                 lineups?.home?.composition || null,
                 lineups?.away?.composition || null,
                 finalMatchId]
            );
            counters.updated++;
        } else {
            finalMatchId = matchId;
            await client.query(
                `INSERT INTO v4.matches
                 (match_id, source_provider, source_match_id, competition_id, season_label,
                  match_date, home_club_id, away_club_id, home_score, away_score,
                  home_formation, away_formation, source_file)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    finalMatchId,
                    'transfermarkt-covered-league',
                    _parser?.match_id ? `tm-${_parser.match_id}` : `tm-${finalMatchId}`,
                    competitionId,
                    seasonLabel,
                    matchDate,
                    homeClubId,
                    awayClubId,
                    scorebox.home_goals,
                    scorebox.away_goals,
                    lineups?.home?.composition || null,
                    lineups?.away?.composition || null,
                    path.basename(filePath),
                ]
            );
            counters.inserted++;
        }

        // 2. Events (business key: match_id, minute_label, event_type, player_id)
        let evOrder = 0;
        for (const ev of events) {
            const mapped = mapEvent(ev, evOrder++);
            if (!mapped) continue;

            const playerId = await findPerson(mapped.player_name);
            const relatedId = await findPerson(mapped.related_player_name);
            const eventId = makeEventId(finalMatchId, mapped.event_order);
            const detail = [mapped.player_name, mapped.related_player_name].filter(Boolean).join(' | ') || null;

            await client.query(
                `INSERT INTO v4.match_events
                 (match_event_id, match_id, event_order, minute_label, side, event_type,
                  player_id, related_player_id, goal_type, card_type, detail, score_at_event)
                 SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
                 WHERE NOT EXISTS (
                     SELECT 1 FROM v4.match_events
                     WHERE match_id = $2
                       AND minute_label IS NOT DISTINCT FROM $4
                       AND event_type = $6
                       AND player_id IS NOT DISTINCT FROM $7
                 )`,
                [eventId, finalMatchId, mapped.event_order, mapped.minute_label,
                 mapped.side, mapped.event_type, playerId, relatedId,
                 mapped.goal_type, mapped.card_type, detail, mapped.score_at_event]
            );
            counters.eventsInserted++;
        }

        // 3. Lineups (business key: match_id, club_id, player_name)
        for (const [side, sideData] of [['home', lineups?.home], ['away', lineups?.away]]) {
            if (!sideData) continue;
            const clubId = side === 'home' ? homeClubId : awayClubId;
            const titulaires = sideData.titulaires || sideData.players || [];
            const remplacants = sideData.remplacants || [];

            for (const p of [...titulaires.map(pl => ({ ...pl, is_starter: true })),
                              ...remplacants.map(pl => ({ ...pl, is_starter: false }))]) {
                if (!p.name) continue;
                const personId = await findPerson(p.name);

                await client.query(
                    `INSERT INTO v4.match_lineups
                     (match_id, club_id, player_id, side, is_starter, jersey_number, position_code, player_name)
                     SELECT $1, $2, $3, $4, $5, $6, $7, $8
                     WHERE NOT EXISTS (
                         SELECT 1 FROM v4.match_lineups
                         WHERE match_id = $1 AND club_id = $2 AND side = $4
                           AND player_name IS NOT DISTINCT FROM $8
                     )`,
                    [finalMatchId, clubId, personId ?? null, side,
                     p.is_starter ?? true,
                     p.numero || null,
                     p.role || p.position_code || null,
                     p.name]
                );
                counters.lineupsInserted++;
            }
        }

        await client.query('COMMIT');

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        logger.error({ err: err.message, file: path.basename(filePath) }, 'Match import failed — rolled back');
        counters.errors++;
    } finally {
        if (client) client.release();
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    await db.init();

    // Résoudre ou créer la compétition
    let competition = await db.get(
        `SELECT competition_id::text AS competition_id FROM v4.competitions WHERE name = ?`,
        [config.dbName]
    );

    if (!competition) {
        if (!isDryRun) {
            // Use same country_id as UEFA Europa League (UEFA/European competitions share country context)
            const uel = await db.get(
                `SELECT country_id::text AS country_id FROM v4.competitions WHERE name = 'UEFA Europa League' LIMIT 1`
            );
            const countryId = uel?.country_id ?? '8442409308853252363'; // fallback to UEL country_id
            // Generate ID via hashtext (same pattern as import_sql_v4.js)
            const idRow = await db.get(
                `SELECT ('x' || substr(md5(?), 1, 16))::bit(64)::bigint AS competition_id`,
                [config.dbName]
            );
            const newId = idRow.competition_id;
            await db.run(
                `INSERT INTO v4.competitions (competition_id, country_id, name, competition_type, source_key)
                 VALUES (?, ?, ?, 'cup', ?)
                 ON CONFLICT (competition_id) DO NOTHING`,
                [newId, countryId, config.dbName, config.dbName.toLowerCase().replace(/\s+/g, '-')]
            );
            competition = await db.get(
                `SELECT competition_id::text AS competition_id FROM v4.competitions WHERE name = ?`,
                [config.dbName]
            );
            logger.info({ name: config.dbName, competition_id: competition.competition_id }, 'Created competition');
        } else {
            logger.info({ name: config.dbName }, '[dry-run] Would create competition');
            competition = { competition_id: '0' };
        }
    }

    const competitionId = competition.competition_id;
    logger.info({ competition: config.dbName, competition_id: competitionId }, 'Using competition');

    const baseDir = path.join(COVERED_LEAGUE_BASE, config.folder);
    const seasons = fs.readdirSync(baseDir).filter(d => /^\d{4}-\d{4}$/.test(d)).sort();

    const filteredSeasons = sinceArg
        ? seasons.filter(s => s >= sinceArg)
        : seasons;

    logger.info({ total_seasons: filteredSeasons.length, seasons: filteredSeasons }, 'Seasons to process');

    const counters = {
        inserted: 0, updated: 0, skipped: 0, errors: 0,
        eventsInserted: 0, lineupsInserted: 0,
    };

    for (const season of filteredSeasons) {
        const seasonDir = path.join(baseDir, season);
        const files = fs.readdirSync(seasonDir)
            .filter(f => f.endsWith('.json'))
            .sort();

        logger.info({ season, files: files.length }, 'Processing season');

        for (const file of files) {
            await importMatch(path.join(seasonDir, file), competitionId, season, counters);
        }

        logger.info({ season, ...counters }, 'Season complete');
    }

    logger.info(counters, 'Import complete');

    // Vérification anti-doublon finale
    const dupes = await db.all(
        `SELECT COUNT(*) as c FROM v4.match_events
         GROUP BY match_id, minute_label, event_type, player_id
         HAVING COUNT(*) > 1`
    );
    if (dupes.length === 0) {
        logger.info({}, '✅ ZERO duplicate match_events — integrity confirmed');
    } else {
        logger.warn({ duplicate_groups: dupes.length }, '⚠️ Duplicate match_events detected');
    }
}

main()
    .catch(err => { logger.error({ err }, 'Fatal'); process.exit(1); })
    .finally(() => setTimeout(() => process.exit(0), 500));
