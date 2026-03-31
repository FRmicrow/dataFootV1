/**
 * Universal Historical Master Importer
 *
 * Production-grade script that:
 *   - Supports ALL leagues (Ligue 1, Serie A, LaLiga, Bundesliga, PL, + cups)
 *   - Resumes interrupted runs via V3_Import_Log
 *   - Persists match scores to V3_Fixtures
 *   - Uses team_resolver_multi for alias-backed, fuzzy-safe team resolution
 *   - Uses resolvePlayerId for alias-backed player resolution
 *   - Phase 9 Update: Dynamic matchday calculation & canonical naming
 */

import 'dotenv/config';
import db from '../../src/config/database.js';
import fs from 'node:fs';
import path from 'node:path';
import logger from '../../src/utils/logger.js';
import { resolveTeamId, resolvePlayerId, clearCache } from './team_resolver_multi.js';

const log = logger.child({ script: 'import_historical_master' });

// ─────────────────────────────────────────────────────────────
// CLI ARGUMENT PARSING
// ─────────────────────────────────────────────────────────────

function getArg(name) {
    const idx = process.argv.indexOf(name);
    return idx !== -1 ? process.argv[idx + 1] : null;
}
function hasFlag(name) { return process.argv.includes(name); }

const SOURCE_DIR  = getArg('--path');
const IS_MASTER   = hasFlag('--master');
const DRY_RUN     = hasFlag('--dry-run');
const FORCE       = hasFlag('--force');

// Unified League Registry
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const REGISTRY_PATH = path.join(__dirname, 'historical_league_registry.json');
let LEAGUE_REGISTRY = {};
try {
    LEAGUE_REGISTRY = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (e) {
    log.error('Failed to load league registry:', e.message);
}

// ── Auto-Detection logic ───────────────────────────────────────
let LEAGUE_ID = parseInt(getArg('--league'));
let SEASON_YEAR = parseInt(getArg('--season'));
let COUNTRY_ID = null;

if (SOURCE_DIR) {
    const folderName = path.basename(path.dirname(SOURCE_DIR + '/'));
    const regEntry = LEAGUE_REGISTRY[folderName];
    if (regEntry) {
        LEAGUE_ID = LEAGUE_ID || regEntry.league_id;
        COUNTRY_ID = regEntry.country_id;
        log.info({ folderName, leagueId: LEAGUE_ID, countryId: COUNTRY_ID }, 'Auto-detected league from path');
    }

    if (!SEASON_YEAR) {
        const seasonMatch = SOURCE_DIR.match(/(\d{4})-\d{4}/);
        if (seasonMatch) {
            SEASON_YEAR = parseInt(seasonMatch[1]);
            log.info({ season: SEASON_YEAR }, 'Auto-detected season from path');
        }
    }
}

if (!LEAGUE_ID || !SEASON_YEAR || !SOURCE_DIR) {
    console.error('Usage: node import_historical_master.js --path <dir> [--league <id>] [--season <year>] [--master] [--dry-run] [--force]');
    process.exit(1);
}

const LEAGUE_CONFIG = {
    1:   { country: 'France',      dateLocale: 'fr' },
    2:   { country: 'Italy',       dateLocale: 'it' },
    3:   { country: 'Spain',       dateLocale: 'es' },
    4:   { country: 'Germany',     dateLocale: 'de' },
    5:   { country: 'England',     dateLocale: 'en' },
    61:  { country: 'France',      dateLocale: 'fr' },
    88:  { country: 'Netherlands', dateLocale: 'nl' },
    94:  { country: 'Portugal',    dateLocale: 'pt' },
    144: { country: 'Belgium',     dateLocale: 'fr' },
    179: { country: 'Scotland',    dateLocale: 'en' },
    203: { country: 'Turkey',      dateLocale: 'tr' },
    307: { country: 'Saudi Arabia',dateLocale: 'en' },
    271: { country: 'Belgium',     dateLocale: 'fr' },
};

const config = LEAGUE_CONFIG[LEAGUE_ID] ?? { country: 'France', dateLocale: 'fr' };
const COUNTRY = config.country;

const MONTH_MAPS = {
    fr: { 'janv':1,'jan':1,'fevr':2,'fev':2,'mars':3,'avr':4,'mai':5,'juin':6,'juil':7,'jul':7,'aout':8,'août':8,'sept':9,'oct':10,'nov':11,'dec':12,'déc':12, 'janvier':1,'février':2,'mars':3,'avril':4,'mai':5,'juin':6,'juillet':7,'août':8,'septembre':9,'octobre':10,'novembre':11,'décembre':12 },
    de: { 'jan':1,'feb':2,'mär':3,'mar':3,'apr':4,'mai':5,'jun':6,'jul':7,'aug':8,'sep':9,'okt':10,'nov':11,'dez':12, 'januar':1,'februar':2,'märz':3,'april':4,'mai':5,'juni':6,'juli':7,'august':8,'september':9,'oktober':10,'november':11,'dezember':12 },
    es: { 'ene':1,'feb':2,'mar':3,'abr':4,'may':5,'jun':6,'jul':7,'ago':8,'sep':9,'oct':10,'nov':11,'dic':12, 'enero':1,'febrero':2,'marzo':3,'abril':4,'mayo':5,'junio':6,'julio':7,'agosto':8,'septiembre':9,'octobre':10,'noviembre':11,'diciembre':12 },
    it: { 'gen':1,'feb':2,'mar':3,'apr':4,'mag':5,'giu':6,'lug':7,'ago':8,'set':9,'ott':10,'nov':11,'dic':12, 'gennaio':1,'febbraio':2,'marzo':3,'aprile':4,'maggio':5,'giugno':6,'luglio':7,'agosto':8,'settembre':9,'ottobre':10,'novembre':11,'dicembre':12 },
    en: { 'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12, 'january':1,'february':2,'march':3,'april':4,'may':5,'june':6,'july':7,'august':8,'september':9,'october':10,'november':11,'december':12 }
};
const ALL_MONTHS = Object.values(MONTH_MAPS).reduce((acc, m) => Object.assign(acc, m), {});

function parseDate(dateStr, seasonYear, inferredRound) {
    if (!dateStr) {
        if (inferredRound) {
            const d = new Date(seasonYear, 0, 1);
            d.setDate(d.getDate() + (inferredRound - 1));
            return d.toISOString().split('T')[0];
        }
        return null;
    }
    const cleaned = dateStr.replace(/^[a-zàáâäèéêëîôùû.]+[,.]?\s*/i, '').trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
        const [d, m, y] = cleaned.split('/');
        return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
        const day = parts[0].replace(/\D/g, '');
        const monthRaw = parts[1].toLowerCase().replace(/[.,]/g, '');
        const year = parts[2] ? parts[2].replace(/\D/g, '') : String(seasonYear);
        const monthNum = (MONTH_MAPS[config.dateLocale]?.[monthRaw] ?? ALL_MONTHS[monthRaw]);
        if (day && monthNum && year) return `${year}-${String(monthNum).padStart(2,'0')}-${day.padStart(2,'0')}`;
    }
    return null;
}

// ─────────────────────────────────────────────────────────────
// DATABASE HELPERS
// ─────────────────────────────────────────────────────────────

async function getImportLog() {
    return db.get(`SELECT * FROM V3_Import_Log WHERE league_id = $1 AND season_year = $2 AND source = 'transfermarkt'`, [LEAGUE_ID, SEASON_YEAR]);
}

async function upsertImportLog(status, counters = {}) {
    const existing = await getImportLog();
    if (existing) {
        await db.run(`UPDATE V3_Import_Log SET status=$1, files_total=$2, files_ok=$3, files_skipped=$4, files_error=$5, fixtures_created=$6, fixtures_matched=$7, events_imported=$8, players_imported=$9, started_at=COALESCE(started_at, $10), completed_at=CASE WHEN $1 IN ('done','failed') THEN $10 ELSE completed_at END, error_detail=$11 WHERE league_id=$12 AND season_year=$13 AND source='transfermarkt'`,
            [status, counters.filesTotal||existing.files_total, counters.filesOk||existing.files_ok, counters.filesSkipped||existing.files_skipped, counters.filesError||existing.files_error, counters.fixturesCreated||existing.fixtures_created, counters.fixturesMatched||existing.fixtures_matched, counters.eventsImported||existing.events_imported, counters.playersImported||existing.players_imported, new Date().toISOString(), counters.errorDetail||null, LEAGUE_ID, SEASON_YEAR]);
    } else {
        await db.run(`INSERT INTO V3_Import_Log (league_id, season_year, source, status, files_total, files_ok, files_skipped, files_error, fixtures_created, fixtures_matched, events_imported, players_imported, started_at, error_detail) VALUES ($1,$2,'transfermarkt',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [LEAGUE_ID, SEASON_YEAR, status, counters.filesTotal||0, counters.filesOk||0, counters.filesSkipped||0, counters.filesError||0, counters.fixturesCreated||0, counters.fixturesMatched||0, counters.eventsImported||0, counters.playersImported||0, new Date().toISOString(), counters.errorDetail||null]);
    }
}

function getLineupPlayers(sideLineup) {
    if (!sideLineup) return { starters: [], subs: [] };
    if (Array.isArray(sideLineup.titulaires) || Array.isArray(sideLineup.remplacants)) {
        return { starters: sideLineup.titulaires ?? [], subs: sideLineup.remplacants ?? [] };
    }
    return { starters: sideLineup.players ?? [], subs: [] };
}

async function ingestFixture(client, data, homeId, awayId, fixtureId, isNew) {
    const tmMatchId = data._parser.match_id;
    const dateStr   = parseDate(data._parser.date, SEASON_YEAR);
    const homeGoals = data.scorebox.home_goals ?? null;
    const awayGoals = data.scorebox.away_goals ?? null;

    await client.run(`UPDATE V3_Fixtures SET tm_match_id=COALESCE(tm_match_id, $1), data_source='transfermarkt', date=COALESCE(date, $2), goals_home=COALESCE(goals_home, $3), goals_away=COALESCE(goals_away, $4), status_short='FT', updated_at=CURRENT_TIMESTAMP WHERE fixture_id=$5`,
        [tmMatchId, dateStr, homeGoals, awayGoals, fixtureId]);

    let eventsCount = 0;
    await client.run(`DELETE FROM V3_Fixture_Events WHERE fixture_id = $1`, [fixtureId]);
    for (const ev of (data.events ?? [])) {
        const teamId = ev.side === 'home' ? homeId : awayId;
        const rawName = ev.joueur ?? ev.but ?? ev.joueur_in ?? null;
        let pId = null;
        if (rawName) { pId = (await resolvePlayerId(rawName, client))?.player_id; }
        await client.run(`INSERT INTO V3_Fixture_Events (fixture_id, time_elapsed, team_id, player_id, player_name, type, detail, data_source) VALUES ($1,$2,$3,$4,$5,$6,$7,'transfermarkt')`,
            [fixtureId, parseInt(ev.minute)||0, teamId, pId, rawName, ev.type==='substitution'?'subst':ev.type==='card'?'Card':'Goal', ev.detail||ev.card_type||ev.goal_type||null]);
        eventsCount++;
    }

    let playersCount = 0;
    await client.run(`DELETE FROM V3_Fixture_Player_Stats WHERE fixture_id = $1`, [fixtureId]);
    for (const side of ['home', 'away']) {
        const tId = side === 'home' ? homeId : awayId;
        const sideLineup = data.lineups?.[side];
        if (!sideLineup) continue;
        const { starters, subs } = getLineupPlayers(sideLineup);
        const processList = async (list, isStart) => {
            const uiList = [];
            for (const p of list) {
                const r = await resolvePlayerId(p.name, client);
                if (!r) continue;
                await client.run(`INSERT INTO V3_Fixture_Player_Stats (fixture_id, team_id, player_id, is_start_xi, position) VALUES ($1,$2,$3,$4,$5)`,
                    [fixtureId, tId, r.player_id, isStart, p.role||null]);
                uiList.push({ player: { id: r.player_id, name: p.name, number: p.numero||null, pos: p.role||null } });
                playersCount++;
            }
            return uiList;
        };
        const sUi = await processList(starters, true);
        const rUi = await processList(subs, false);
        await client.run(`INSERT INTO V3_Fixture_Lineups (fixture_id, team_id, coach_name, formation, starting_xi, substitutes) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (fixture_id, team_id) DO UPDATE SET coach_name=EXCLUDED.coach_name, formation=EXCLUDED.formation, starting_xi=EXCLUDED.starting_xi, substitutes=EXCLUDED.substitutes`,
            [fixtureId, tId, sideLineup.entraineur||null, sideLineup.composition||null, JSON.stringify(sUi), JSON.stringify(rUi)]);
    }
    return { eventsCount, playersCount };
}

// ─────────────────────────────────────────────────────────────
// MAIN RUNNER
// ─────────────────────────────────────────────────────────────

async function run() {
    try {
        await db.init();
        clearCache();

        if (!fs.existsSync(SOURCE_DIR)) {
            log.error({ path: SOURCE_DIR }, 'Source directory not found');
            process.exit(1);
        }

        const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json')).sort();

        // Phase 9: Pre-scan for Team Count Fix
        const uniqueTeams = new Set();
        log.info('Pre-scanning for team count...');
        for (const file of files) {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'));
                const h = data.info?.home_name || data.scorebox?.home_team;
                const a = data.info?.away_name || data.scorebox?.away_team;
                if (h) uniqueTeams.add(h);
                if (a) uniqueTeams.add(a);
            } catch (e) {}
        }
        const numTeams = uniqueTeams.size || 20;
        const matchesPerRound = Math.floor(numTeams / 2) || 10;
        log.info({ numTeams, matchesPerRound }, 'Pre-scan complete');

        if (!DRY_RUN) {
            const ext = await getImportLog();
            if (ext?.status === 'done' && !FORCE) {
                log.info('Season already completed. Skip.');
                process.exit(0);
            }
            await upsertImportLog('running', { filesTotal: files.length });
        }

        const counters = { filesTotal: files.length, filesOk: 0, filesSkipped: 0, filesError: 0, fixturesCreated: 0, fixturesMatched: 0, eventsImported: 0, playersImported: 0 };
        const teamsCache = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const seqMatch = file.match(/^(\d+)_/);
            const seqNum = seqMatch ? parseInt(seqMatch[1]) : (i + 1);
            const currentRound = Math.ceil(seqNum / matchesPerRound);
            const roundStr = `Regular Season - ${currentRound}`;

            try {
                const data = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'));
                const hName = data.scorebox?.home_team;
                const aName = data.scorebox?.away_team;
                if (!hName || !aName) { counters.filesSkipped++; continue; }

                const hId = await resolveTeamId(hName, db, teamsCache, COUNTRY_ID);
                const aId = await resolveTeamId(aName, db, teamsCache, COUNTRY_ID);
                if (!hId || !aId) { counters.filesSkipped++; continue; }

                const dateStr = parseDate(data._parser?.date, SEASON_YEAR, currentRound);
                let fixture = null;
                let isNew = false;

                // Match by TM ID
                if (data._parser?.match_id) {
                    fixture = await db.get(`SELECT fixture_id FROM V3_Fixtures WHERE tm_match_id = $1`, [data._parser.match_id]);
                }
                // Match by teams + date
                if (!fixture && dateStr) {
                    fixture = await db.get(`SELECT fixture_id FROM V3_Fixtures WHERE league_id=$1 AND season_year=$2 AND home_team_id=$3 AND away_team_id=$4 AND (date::date BETWEEN ($5::date - INTERVAL '2 days') AND ($5::date + INTERVAL '2 days'))`, [LEAGUE_ID, SEASON_YEAR, hId, aId, dateStr]);
                }
                // Match by teams + round (Final fallback)
                if (!fixture) {
                    fixture = await db.get(`SELECT fixture_id FROM V3_Fixtures WHERE league_id=$1 AND season_year=$2 AND home_team_id=$3 AND away_team_id=$4 AND round=$5`, [LEAGUE_ID, SEASON_YEAR, hId, aId, roundStr]);
                }

                if (!fixture && IS_MASTER) {
                    const res = await db.run(`INSERT INTO V3_Fixtures (league_id, season_year, home_team_id, away_team_id, date, tm_match_id, data_source, status_short, goals_home, goals_away, round) VALUES ($1,$2,$3,$4,$5,$6,'transfermarkt_master','FT',$7,$8,$9) RETURNING fixture_id`,
                        [LEAGUE_ID, SEASON_YEAR, hId, aId, dateStr, data._parser.match_id, data.scorebox.home_goals, data.scorebox.away_goals, roundStr]);
                    fixture = { fixture_id: res.lastInsertRowid || res.rows?.[0]?.fixture_id };
                    isNew = true;
                    counters.fixturesCreated++;
                }

                if (!fixture) { counters.filesSkipped++; continue; }
                if (!isNew) counters.fixturesMatched++;

                if (!DRY_RUN) {
                    const client = await db.getTransactionClient();
                    try {
                        await client.beginTransaction();
                        const { eventsCount, playersCount } = await ingestFixture(client, data, hId, aId, fixture.fixture_id, isNew);
                        await client.commit();
                        counters.eventsImported += eventsCount;
                        counters.playersImported += playersCount;
                        counters.filesOk++;
                    } catch (e) {
                        await client.rollback();
                        counters.filesError++;
                    } finally { client.release(); }
                } else { counters.filesOk++; }

            } catch (e) { counters.filesError++; }
        }

        if (!DRY_RUN) await upsertImportLog('done', counters);
        log.info(counters, 'Import done');
        process.exit(0);
    } catch (e) {
        log.error(e.message);
        process.exit(1);
    }
}

run();
