/**
 * update-match-results.js
 *
 * Reads scraped match results from stdin (JSON) and applies them to the DB.
 *
 * Two entry types:
 *   action="update" → match already exists in v4.matches (league match)
 *                     → UPDATE home_score/away_score + UPSERT match_stats
 *   action="insert" → cup match not pre-imported
 *                     → dedup check, then INSERT + UPSERT match_stats
 *
 * Deduplication:
 *   - update: WHERE home_score IS NULL → skip if already scored
 *   - insert: check (match_date, home_club_id, away_club_id) → skip if exists
 *
 * Usage:
 *   python scrape-flashscore-results.py | node update-match-results.js
 *   python scrape-flashscore-results.py --mode=all | node update-match-results.js
 *   node update-match-results.js --dry-run --input=results.json
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Resolve backend/ from project root (scripts live in .claude/skills/flashscore-scraper/scripts/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _projectRoot = path.resolve(__dirname, '../../../../');
const _backendDir = path.join(_projectRoot, 'backend');
const _backendSrc = path.join(_backendDir, 'src');

// Load backend .env before importing modules that need DATABASE_URL
// If DATABASE_URL is already in the environment, dotenv is optional
if (!process.env.DATABASE_URL) {
    try {
        const { default: dotenv } = await import(
            path.join(_backendDir, 'node_modules', 'dotenv', 'lib', 'main.js')
        );
        dotenv.config({ path: path.join(_backendDir, '.env') });
    } catch {
        // dotenv unavailable — DATABASE_URL must be set externally
    }
}

const { default: db } = await import(`${_backendSrc}/config/database.js`);
const { default: logger } = await import(`${_backendSrc}/utils/logger.js`);

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const inputArg = args.find(a => a.startsWith('--input='))?.split('=')[1];

// ---------------------------------------------------------------------------
// Club name normalization — mirrors scraper + import-v4-upcoming.js
// ---------------------------------------------------------------------------
function normalize(name) {
    return name.toLowerCase()
        .replace(/\b(fc|utd|united|city|afc|rc|ogc|as|ol|aj|sco|ac|cf|sc)\b/g, '')
        .replace(/[^\w\s]/g, '')
        .trim();
}

async function findClub(name) {
    const norm = normalize(name);

    // 1. Exact match (case-insensitive)
    let club = await db.get('SELECT club_id::text AS club_id, name FROM v4.clubs WHERE LOWER(name) = ?', [name.toLowerCase()]);
    if (club) return club;

    // 2. Normalized contains
    club = await db.get('SELECT club_id::text AS club_id, name FROM v4.clubs WHERE LOWER(name) LIKE ?', [`%${norm}%`]);
    if (club) return club;

    // 3. Fuzzy: scan all clubs
    const all = await db.all('SELECT club_id::text AS club_id, name FROM v4.clubs');
    return all.find(c => {
        const cn = normalize(c.name);
        return cn.includes(norm) || norm.includes(cn);
    }) || null;
}

async function findCompetition(name) {
    let comp = await db.get(
        "SELECT competition_id::text AS competition_id FROM v4.competitions WHERE LOWER(name) = ?",
        [name.toLowerCase()]
    );
    if (comp) return comp;
    comp = await db.get(
        "SELECT competition_id::text AS competition_id FROM v4.competitions WHERE name ILIKE ?",
        [`%${name}%`]
    );
    return comp || null;
}

// ---------------------------------------------------------------------------
// Event ID generation (mirrors backfill-match-stats.py make_event_id)
// ---------------------------------------------------------------------------
import crypto from 'crypto';

function makeEventId(matchId, eventOrder) {
    const raw = `ev_${matchId}_${eventOrder}`;
    const hex = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 15);
    return BigInt(`0x${hex}`);
}

// ---------------------------------------------------------------------------
// Events upsert
// ---------------------------------------------------------------------------
const EVENT_TYPE_MAP = {
    yellowcard: { card_type: 'yellow',      goal_type: null },
    redcard:    { card_type: 'red',         goal_type: null },
    yellowred:  { card_type: 'yellow_red',  goal_type: null },
    goal:       { card_type: null,          goal_type: 'normal' },
    owngoal:    { card_type: null,          goal_type: 'own' },
};

async function findPersonByName(name) {
    if (!name) return null;

    // 1. Exact match (full name)
    let row = await db.get(
        `SELECT person_id::text AS person_id FROM v4.people WHERE full_name ILIKE ? LIMIT 1`,
        [name]
    );
    if (row) return row.person_id;

    // 2. "Lastname I." format → match lastname + first initial
    //    e.g. "Akpoguma K." → last="Akpoguma" initial="K"
    const withInitialMatch = name.match(/^(.+?)\s+([A-Z])\.$/)
    if (withInitialMatch) {
        const [, lastName, initial] = withInitialMatch;
        // Match "Firstname I. Lastname" or "Firstname Lastname" where lastname is exact word boundary
        row = await db.get(
            `SELECT person_id::text AS person_id FROM v4.people
             WHERE (full_name ILIKE ? OR full_name ILIKE ?)
               AND full_name ~* ?
             LIMIT 1`,
            [`${initial}% ${lastName}`, `${initial}% ${lastName} %`, `(^|\\s)${lastName}(\\s|$)`]
        );
        if (row) return row.person_id;
    }

    // 3. Single word name → match as last name component
    //    e.g. "Musiala", "Andrich"
    if (!name.includes(' ')) {
        row = await db.get(
            `SELECT person_id::text AS person_id FROM v4.people
             WHERE full_name ILIKE ?
             LIMIT 1`,
            [`% ${name}`]
        );
        if (row) return row.person_id;
    }

    return null;
}

async function upsertMatchEvents(matchId, events) {
    if (!events || events.length === 0) return 0;
    let written = 0;
    for (const ev of events) {
        const { event_type } = ev;
        if (event_type === 'other') continue;

        const eventId   = makeEventId(matchId, ev.event_order);
        const playerId  = await findPersonByName(ev.player_name);
        const relatedId = await findPersonByName(ev.related_player_name);
        const meta      = EVENT_TYPE_MAP[event_type] ?? { card_type: null, goal_type: null };
        // Always store player names — display fallback when person_id is NULL,
        // and carries both names (out/in) for substitutions.
        const detail = [ev.player_name, ev.related_player_name].filter(Boolean).join(' | ') || null;

        // Dedup by business key (match_id, minute_label, event_type, player_id)
        // instead of ordinal match_event_id hash (which is fragile to event reordering)
        const { changes } = await db.run(
            `INSERT INTO v4.match_events
             (match_event_id, match_id, event_order, minute_label, side, event_type,
              player_id, related_player_id, goal_type, card_type, detail, score_at_event)
             SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
             WHERE NOT EXISTS (
                 SELECT 1 FROM v4.match_events
                 WHERE match_id = ?
                   AND minute_label IS NOT DISTINCT FROM ?
                   AND event_type = ?
                   AND player_id IS NOT DISTINCT FROM ?
             )`,
            [
                eventId, matchId, ev.event_order, ev.minute_label ?? null,
                ev.side ?? null, event_type,
                playerId ?? null, relatedId ?? null,
                meta.goal_type, meta.card_type, detail,
                ev.score_at_event ?? null,
                // WHERE NOT EXISTS params:
                matchId, ev.minute_label ?? null, event_type, playerId ?? null,
            ]
        );
        if (changes > 0) written++;
    }
    return written;
}

// ---------------------------------------------------------------------------
// Lineups upsert
// ---------------------------------------------------------------------------
async function upsertMatchLineups(matchId, lineups, homeClubId, awayClubId) {
    if (!lineups || lineups.length === 0) return 0;
    let written = 0;
    for (const p of lineups) {
        const clubId = p.side === 'home' ? homeClubId : awayClubId;
        if (!clubId) continue;
        const personId = await findPersonByName(p.player_name);

        try {
            const { changes } = await db.run(
                `INSERT INTO v4.match_lineups
                 (match_id, club_id, player_id, side, is_starter, jersey_number, position_code, player_name)
                 SELECT ?, ?, ?, ?, ?, ?, ?, ?
                 WHERE NOT EXISTS (
                     SELECT 1 FROM v4.match_lineups
                     WHERE match_id = ? AND club_id = ? AND side = ?
                       AND player_name IS NOT DISTINCT FROM ?
                 )`,
                [
                    matchId, clubId, personId ?? null,
                    p.side, p.is_starter ?? false,
                    p.jersey_number ?? null, p.position_code ?? null,
                    p.player_name ?? null,
                    // WHERE NOT EXISTS params
                    matchId, clubId, p.side, p.player_name ?? null,
                ]
            );
            if (changes > 0) written++;
        } catch (err) {
            logger.warn({ err, match_id: matchId, player_name: p.player_name }, 'Lineup upsert failed — skipping player');
        }
    }
    return written;
}

// ---------------------------------------------------------------------------
// Stats upsert builder
// ---------------------------------------------------------------------------
const STAT_COLUMN_MAP = {
    ht_home:          'home_score_ht',
    ht_away:          'away_score_ht',
    home_poss_ft:     'home_poss_ft',    away_poss_ft:     'away_poss_ft',
    home_shots_ft:    'home_shots_ft',   away_shots_ft:    'away_shots_ft',
    home_shots_ot_ft: 'home_shots_ot_ft', away_shots_ot_ft: 'away_shots_ot_ft',
    home_shots_off_ft:'home_shots_off_ft', away_shots_off_ft:'away_shots_off_ft',
    home_corners_ft:  'home_corners_ft', away_corners_ft:  'away_corners_ft',
    home_yellows_ft:  'home_yellows_ft', away_yellows_ft:  'away_yellows_ft',
    home_poss_1h:     'home_poss_1h',    away_poss_1h:     'away_poss_1h',
    home_shots_1h:    'home_shots_1h',   away_shots_1h:    'away_shots_1h',
    home_shots_ot_1h: 'home_shots_ot_1h', away_shots_ot_1h: 'away_shots_ot_1h',
    home_shots_off_1h:'home_shots_off_1h', away_shots_off_1h:'away_shots_off_1h',
    home_corners_1h:  'home_corners_1h', away_corners_1h:  'away_corners_1h',
    home_yellows_1h:  'home_yellows_1h', away_yellows_1h:  'away_yellows_1h',
    home_poss_2h:     'home_poss_2h',    away_poss_2h:     'away_poss_2h',
    home_shots_2h:    'home_shots_2h',   away_shots_2h:    'away_shots_2h',
    home_shots_ot_2h: 'home_shots_ot_2h', away_shots_ot_2h: 'away_shots_ot_2h',
    home_shots_off_2h:'home_shots_off_2h', away_shots_off_2h:'away_shots_off_2h',
    home_corners_2h:  'home_corners_2h', away_corners_2h:  'away_corners_2h',
    home_yellows_2h:  'home_yellows_2h', away_yellows_2h:  'away_yellows_2h',
};

function buildMatchStatsUpsert(match_id, result) {
    const columns = ['match_id'];
    const values = [match_id];

    for (const [key, col] of Object.entries(STAT_COLUMN_MAP)) {
        const val = result[key];
        if (val != null) {
            columns.push(col);
            values.push(val);
        }
    }

    if (columns.length === 1) return null;

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const updates = columns.slice(1).map(col => `${col} = EXCLUDED.${col}`).join(', ');

    return {
        sql: `INSERT INTO v4.match_stats (${columns.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT (match_id) DO UPDATE SET ${updates}`,
        values,
    };
}

// ---------------------------------------------------------------------------
// Hash-based match ID generation (mirrors import-upcoming-from-json.js)
// ---------------------------------------------------------------------------
function generateMatchId(home, away, date, competition) {
    const str = `fs-cup-${competition}-${home}-${away}-${date}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    // Use offset 8800000000 for cup matches (leagues use 9900000000)
    return 8800000000 + Math.abs(hash);
}

// ---------------------------------------------------------------------------
// Scraped markers — idempotence stamps on v4.matches
// ---------------------------------------------------------------------------
async function setScrapedMarkers(matchId, { score, stats, events, lineups }) {
    const sets = [];
    if (score)   sets.push('scraped_score_at = NOW()');
    if (stats)   sets.push('scraped_stats_at = NOW()');
    if (events)  sets.push('scraped_events_at = NOW()');
    if (lineups) sets.push('scraped_lineups_at = NOW()');
    if (sets.length === 0) return;
    await db.run(
        `UPDATE v4.matches SET ${sets.join(', ')} WHERE match_id = ?`,
        [matchId]
    );
}

// ---------------------------------------------------------------------------
// action="update": update an existing league match
// ---------------------------------------------------------------------------
async function processUpdate(result, counters) {
    const { match_id, home_score, away_score } = result;

    if (match_id == null || home_score == null || away_score == null) {
        logger.warn({ result }, 'Incomplete update result — skipping');
        counters.skipped++;
        return;
    }

    if (isDryRun) {
        const statsUpsert = buildMatchStatsUpsert(match_id, result);
        logger.info({ match_id, home_score, away_score, stats_cols: statsUpsert ? statsUpsert.values.length - 1 : 0 }, '[dry-run] Would update match');
        counters.updated++;
        return;
    }

    try {
        const { changes } = await db.run(
            `UPDATE v4.matches
             SET home_score = ?, away_score = ?
             WHERE match_id = ? AND home_score IS NULL`,
            [home_score, away_score, match_id]
        );

        // Score already present: don't skip — still write stats/events/lineups if scraper provided them
        const scoreWasNew = changes > 0;
        if (scoreWasNew) {
            logger.info({ match_id, home_score, away_score }, 'Updated match score');
            counters.updated++;
        } else {
            // Verify match exists at all
            const exists = await db.get(`SELECT 1 FROM v4.matches WHERE match_id = ?`, [match_id]);
            if (!exists) {
                logger.warn({ match_id }, 'Match not found in DB — skipped');
                counters.skipped++;
                return;
            }
            logger.debug({ match_id }, 'Score already present — writing detail only');
        }

        const markers = { score: true, stats: false, events: false, lineups: false };

        const statsUpsert = buildMatchStatsUpsert(match_id, result);
        if (statsUpsert) {
            await db.run(statsUpsert.sql, statsUpsert.values);
            counters.statsUpserted++;
            markers.stats = true;
        }

        const eventsWritten = await upsertMatchEvents(match_id, result._events);
        counters.eventsInserted = (counters.eventsInserted ?? 0) + eventsWritten;
        // Mark events attempted if scraper provided the field (even if list is empty = no events in match)
        if ('_events' in result) markers.events = true;

        if (result._lineups?.length) {
            // Cast club_ids to text to avoid 64-bit BIGINT precision loss in JS
            const matchRow = await db.get(
                `SELECT home_club_id::text AS home_club_id, away_club_id::text AS away_club_id FROM v4.matches WHERE match_id = ?`,
                [match_id]
            );
            if (matchRow) {
                const lineupsWritten = await upsertMatchLineups(
                    match_id, result._lineups, matchRow.home_club_id, matchRow.away_club_id
                );
                counters.lineupsInserted = (counters.lineupsInserted ?? 0) + lineupsWritten;
            }
        }
        if ('_lineups' in result) markers.lineups = true;

        await setScrapedMarkers(match_id, markers);
    } catch (err) {
        logger.error({ err, match_id }, 'Failed to update match');
        counters.skipped++;
    }
}

// ---------------------------------------------------------------------------
// action="insert": discover and insert a cup match
// ---------------------------------------------------------------------------
async function processInsert(result, counters) {
    const { competition_name, home_team, away_team, match_date, home_score, away_score } = result;

    if (!home_team || !away_team || !match_date || home_score == null || away_score == null) {
        logger.warn({ result }, 'Incomplete insert result — skipping');
        counters.skipped++;
        return;
    }

    if (isDryRun) {
        logger.info({ home_team, away_team, match_date, home_score, away_score }, '[dry-run] Would insert cup match');
        counters.inserted++;
        return;
    }

    try {
        // 1. Resolve clubs
        const homeClub = await findClub(home_team);
        const awayClub = await findClub(away_team);

        if (!homeClub || !awayClub) {
            logger.warn(
                { home_team, homeFound: !!homeClub, away_team, awayFound: !!awayClub },
                'Club(s) not found in v4.clubs — skipped'
            );
            counters.skipped++;
            return;
        }

        // 2. Resolve competition
        const competition = await findCompetition(competition_name);
        if (!competition) {
            logger.warn({ competition_name }, 'Competition not found in v4.competitions — skipped');
            counters.skipped++;
            return;
        }

        // 3. Deduplication: check if match already exists (by date + clubs + competition)
        // Competition_id prevents collision between same clubs on same day in different comps
        const existing = await db.get(
            `SELECT match_id, home_score
             FROM v4.matches
             WHERE match_date = ?::date
               AND home_club_id = ?
               AND away_club_id = ?
               AND competition_id = ?
             LIMIT 1`,
            [match_date, homeClub.club_id, awayClub.club_id, competition.competition_id]
        );

        if (existing) {
            if (existing.home_score != null) {
                // Already has a score — skip entirely
                logger.debug({ match_id: existing.match_id, match_date, home_team, away_team }, 'Cup match already scored — skipped');
                counters.skipped++;
                return;
            }
            // Exists but has no score → update it
            await db.run(
                `UPDATE v4.matches SET home_score = ?, away_score = ? WHERE match_id = ? AND home_score IS NULL`,
                [home_score, away_score, existing.match_id]
            );
            logger.info({ match_id: existing.match_id, home_score, away_score }, 'Updated existing cup match score');
            counters.updated++;

            const statsUpsert = buildMatchStatsUpsert(existing.match_id, result);
            if (statsUpsert) {
                await db.run(statsUpsert.sql, statsUpsert.values);
                counters.statsUpserted++;
            }
            const eventsWritten = await upsertMatchEvents(existing.match_id, result._events);
            counters.eventsInserted = (counters.eventsInserted ?? 0) + eventsWritten;
            let lineupsWrittenExisting = 0;
            if (result._lineups?.length) {
                lineupsWrittenExisting = await upsertMatchLineups(
                    existing.match_id, result._lineups, homeClub.club_id, awayClub.club_id
                );
                counters.lineupsInserted = (counters.lineupsInserted ?? 0) + lineupsWrittenExisting;
            }
            await setScrapedMarkers(existing.match_id, {
                score: true,
                stats: !!statsUpsert,
                events: '_events' in result,
                lineups: '_lineups' in result,
            });
            return;
        }

        // 4. Insert new match
        const match_id = generateMatchId(home_team, away_team, match_date, competition_name);

        // Season label: football seasons start in July/August.
        // A match in 2026-04 belongs to season 2025-2026, not 2026-2027.
        const matchYear = parseInt(match_date.slice(0, 4));
        const matchMonth = parseInt(match_date.slice(5, 7));
        const seasonStart = matchMonth >= 7 ? matchYear : matchYear - 1;
        const season_label = `${seasonStart}-${seasonStart + 1}`;

        await db.run(
            `INSERT INTO v4.matches (
                match_id, source_provider, source_match_id,
                competition_id, season_label, match_date,
                home_club_id, away_club_id,
                home_score, away_score
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (match_id) DO UPDATE SET
                home_score = EXCLUDED.home_score,
                away_score = EXCLUDED.away_score`,
            [
                match_id,
                'scraped-flashscore',
                `fs-${match_id}`,
                competition.competition_id,
                season_label,
                match_date,
                homeClub.club_id,
                awayClub.club_id,
                home_score,
                away_score,
            ]
        );

        logger.info({ match_id, home_team, away_team, match_date, home_score, away_score }, 'Inserted cup match');
        counters.inserted++;

        const statsUpsert = buildMatchStatsUpsert(match_id, result);
        if (statsUpsert) {
            await db.run(statsUpsert.sql, statsUpsert.values);
            counters.statsUpserted++;
        }
        const eventsWritten = await upsertMatchEvents(match_id, result._events);
        counters.eventsInserted = (counters.eventsInserted ?? 0) + eventsWritten;
        if (result._lineups?.length) {
            const lineupsWritten = await upsertMatchLineups(
                match_id, result._lineups, homeClub.club_id, awayClub.club_id
            );
            counters.lineupsInserted = (counters.lineupsInserted ?? 0) + lineupsWritten;
        }
        await setScrapedMarkers(match_id, {
            score: true,
            stats: !!statsUpsert,
            events: '_events' in result,
            lineups: '_lineups' in result,
        });
    } catch (err) {
        logger.error({ err, home_team, away_team, match_date }, 'Failed to insert cup match');
        counters.skipped++;
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function readStdin() {
    return new Promise((resolve, reject) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => { data += chunk; });
        process.stdin.on('end', () => resolve(data));
        process.stdin.on('error', reject);
    });
}

async function main() {
    await db.init();

    let raw;
    if (inputArg) {
        if (!fs.existsSync(inputArg)) throw new Error(`Input file not found: ${inputArg}`);
        raw = fs.readFileSync(inputArg, 'utf8');
    } else {
        raw = await readStdin();
    }

    let results;
    try {
        results = JSON.parse(raw);
    } catch (e) {
        logger.error({ err: e }, 'Failed to parse JSON input');
        process.exit(1);
    }

    if (!Array.isArray(results)) {
        logger.error('Input must be a JSON array');
        process.exit(1);
    }

    const counters = { updated: 0, inserted: 0, statsUpserted: 0, eventsInserted: 0, lineupsInserted: 0, skipped: 0 };
    logger.info({ count: results.length, isDryRun }, 'Starting match result processing');

    for (const result of results) {
        if (result.action === 'update') {
            await processUpdate(result, counters);
        } else if (result.action === 'insert') {
            await processInsert(result, counters);
        } else {
            logger.warn({ action: result.action }, 'Unknown action — skipped');
            counters.skipped++;
        }
    }

    logger.info(counters, 'Done');
}

main()
    .catch(err => {
        logger.error({ err }, 'Fatal error');
        process.exit(1);
    })
    .finally(() => setTimeout(() => process.exit(0), 500));
