/**
 * V29 — import_ml_matches.js
 * Import des données historiques ML depuis les CSV Database-Odds
 * Catégories : Odds, Scores, Overview, Attack/Poss, Corners/Cards
 * Toutes les lignes sont liées à V3_Fixtures (FK NOT NULL)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

// ─── Simple CSV parser (no external deps) ────────────────────────────────────
function parseCsv(content) {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const headers = parseCsvLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCsvLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
        rows.push(row);
    }
    return rows;
}

function parseCsvLine(line) {
    const result = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQuote = !inQuote; continue; }
        if (c === ',' && !inQuote) { result.push(cur); cur = ''; continue; }
        cur += c;
    }
    result.push(cur);
    return result;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSV_DIR: absolu dans le conteneur (/app/ml-csv), ou relatif depuis la racine du projet en dev local
const CSV_DIR = process.env.ML_CSV_DIR
    || path.resolve(__dirname, '../../../Database - Odds - Europe Conference League - LS');


// ─── Mapping ligue ───────────────────────────────────────────────────────────
const LEAGUES = [
    { name: 'Premier League', country: 'England', apiId: 39,  token: 'England Premier League' },
    { name: 'Ligue 1',        country: 'France',  apiId: 61,  token: 'France Ligue 1' },
    { name: 'Bundesliga',     country: 'Germany', apiId: 78,  token: 'Germany Bundesliga' },
    { name: 'Serie A',        country: 'Italy',   apiId: 135, token: 'Italy Serie A' },
    { name: 'La Liga',        country: 'Spain',   apiId: 140, token: 'Spain LaLiga' },
];

// ─── Mapping noms d'équipes CSV → V3_Teams ──────────────────────────────────
const TEAM_NAME_MAP = {
    // Premier League
    'Hull':               'Hull City',
    'Manchester Utd':     'Manchester United',
    'Nottingham':         'Nottingham Forest',
    'Stoke':              'Stoke City',
    // Ligue 1
    'PSG':                'Paris Saint Germain',
    'St Etienne':         'Saint Etienne',
    'GFC Ajaccio':        'Gazelec FC Ajaccio',
    'AC Ajaccio':         'Ajaccio',
    'Troyes':             'Estac Troyes',
    'Brest':              'Stade Brestois 29',
    'Clermont':           'Clermont Foot',
    // Bundesliga
    'B. Monchengladbach': 'Borussia Mönchengladbach',
    'Bayern Munich':      'Bayern München',
    'FC Koln':            '1. FC Köln',
    'Heidenheim':         '1. FC Heidenheim',
    'Greuther Furth':     'SpVgg Greuther Fürth',
    'Dusseldorf':         'Fortuna Düsseldorf',
    'Hannover':           'Hannover 96',
    'Hoffenheim':         '1899 Hoffenheim',
    'Nurnberg':           '1. FC Nürnberg',
    'Paderborn':          'SC Paderborn 07',
    'Schalke':            'FC Schalke 04',
    'Darmstadt':          'SV Darmstadt 98',
    'Freiburg':           'SC Freiburg',
    'Augsburg':           'FC Augsburg',
    'St. Pauli':          'FC St. Pauli',
    'Mainz':              'FSV Mainz 05',
    'Wolfsburg':          'VfL Wolfsburg',
    'Bochum':             'VfL Bochum',
    'Stuttgart':          'VfB Stuttgart',
    'Ingolstadt':         'FC Ingolstadt 04',
    'Dortmund':           'Borussia Dortmund',
    'Hertha Berlin':      'Hertha BSC',
    'Verona':             'Hellas Verona',
    'Inter':              'Inter',   // identical
    // La Liga
    'Atl. Madrid':        'Atletico Madrid',
    'Ath Bilbao':         'Athletic Club',
    'Betis':              'Real Betis',
    'Dep. La Coruna':     'Deportivo La Coruna',
    'Gijon':              'Sporting Gijon',
    'Cadiz CF':           'Cadiz',
};

function normalizeTeamName(name) {
    return TEAM_NAME_MAP[name] || name;
}

// ─── Lecture CSV ─────────────────────────────────────────────────────────────
function readCsv(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''); // strip BOM
    return parseCsv(content);
}

// Try LS, LS (1) variants automatically
function findCsvFile(base, suffix) {
    const variants = [
        path.join(CSV_DIR, `${base} - ${suffix}`),
        path.join(CSV_DIR, `${base} - ${suffix.replace('.csv', ' (1).csv')}`),
    ];
    return variants.find(p => fs.existsSync(p)) || null;
}

function loadCategory(category, leagueToken) {
    const base = `Database - ${category} - ${leagueToken}`;
    const lsPath = findCsvFile(base, 'LS.csv');
    const csPath = findCsvFile(base, 'CS.csv');
    const ls = lsPath ? readCsv(lsPath) : [];
    const cs = csPath ? readCsv(csPath) : [];
    const map = new Map();
    [...ls, ...cs].forEach(r => map.set(r.id, r));
    return map;
}

// ─── Matching V3 fixture ─────────────────────────────────────────────────────
function parseDate(raw) {
    // Format: "DD-MM-YY HH:MM" e.g. "25-05-25 17:00"
    const [datePart, timePart] = raw.trim().split(' ');
    const [dd, mm, yy] = datePart.split('-');
    const year = parseInt(yy, 10) + (parseInt(yy, 10) >= 50 ? 1900 : 2000);
    return new Date(`${year}-${mm}-${dd}T${timePart || '12:00'}:00Z`);
}

async function findFixture(db, leagueId, homeTeam, awayTeam, matchDate) {
    const h = normalizeTeamName(homeTeam);
    const a = normalizeTeamName(awayTeam);

    // Lookup team IDs
    const teamHome = await db.get(
        `SELECT t.team_id FROM v3_teams t
         JOIN v3_fixtures f ON t.team_id = f.home_team_id
         WHERE f.league_id = $1 AND t.name = $2 LIMIT 1`,
        [leagueId, h]
    );
    const teamAway = await db.get(
        `SELECT t.team_id FROM v3_teams t
         JOIN v3_fixtures f ON t.team_id = f.away_team_id
         WHERE f.league_id = $1 AND t.name = $2 LIMIT 1`,
        [leagueId, a]
    );

    if (!teamHome || !teamAway) return null;

    const dateStr = matchDate.toISOString().substring(0, 10);
    const fixture = await db.get(
        `SELECT fixture_id FROM v3_fixtures
         WHERE league_id = $1
           AND home_team_id = $2
           AND away_team_id = $3
           AND date >= $4::date - interval '2 days'
           AND date <= $4::date + interval '2 days'
         LIMIT 1`,
        [leagueId, teamHome.team_id, teamAway.team_id, dateStr]
    );
    return fixture || null;
}

// ─── Import principal ────────────────────────────────────────────────────────
async function importLeague(league) {
    const lg = await db.get(
        `SELECT league_id FROM v3_leagues WHERE api_id = $1`, [league.apiId]
    );
    if (!lg) {
        logger.warn(`⚠️ League not found in V3: ${league.name}`);
        return { inserted: 0, skipped: 0 };
    }
    const leagueId = lg.league_id;

    const odds    = loadCategory('Odds',           league.token);
    const scores  = loadCategory('Scores',         league.token);
    const overview = loadCategory('Overview',      league.token);
    const attack  = loadCategory('Attack  Poss',   league.token);
    const corners = loadCategory('Corners  Cards',  league.token);

    // Base = odds keys (all categories share the same ids)
    const ids = [...odds.keys()];
    logger.info(`📋 ${league.name}: ${ids.length} matches to process`);

    let inserted = 0, skipped = 0;

    for (const id of ids) {
        const o  = odds.get(id)    || {};
        const s  = scores.get(id)  || {};
        const ov = overview.get(id) || {};
        const at = attack.get(id)  || {};
        const cc = corners.get(id) || {};

        const matchDate = parseDate(o.matchDate || ov.matchDate || '');
        const homeTeam = o.homeTeam || ov.homeTeam;
        const awayTeam = o.awayTeam || ov.awayTeam;

        const fixture = await findFixture(db, leagueId, homeTeam, awayTeam, matchDate);
        if (!fixture) {
            logger.warn(`  ⚠️ No V3 fixture: ${homeTeam} vs ${awayTeam} (${matchDate.toISOString().substring(0, 10)})`);
            skipped++;
            continue;
        }

        const n = (v) => (v === '' || v == null) ? null : Number(v);

        try {
            await db.run(`
                INSERT INTO ml_matches (
                    source_id, source_league, source_country, source_season,
                    match_date, home_team, away_team, referee, v3_fixture_id,
                    fthg, ftag, ftr, hg_1h, ag_1h, hg_2h, ag_2h,
                    odds_h, odds_d, odds_a,
                    odds_o05, odds_u05, odds_o15, odds_u15, odds_o25, odds_u25,
                    odds_o35, odds_u35, odds_o45, odds_u45, odds_btts_y, odds_btts_n,
                    h_bp_ft, a_bp_ft, h_bp_1h, a_bp_1h, h_bp_2h, a_bp_2h,
                    h_ts_ft, a_ts_ft, h_ts_1h, a_ts_1h, h_ts_2h, a_ts_2h,
                    h_son_ft, a_son_ft, h_son_1h, a_son_1h, h_son_2h, a_son_2h,
                    h_soff_ft, a_soff_ft, h_soff_1h, a_soff_1h, h_soff_2h, a_soff_2h,
                    h_corners_ft, a_corners_ft, h_corners_1h, a_corners_1h, h_corners_2h, a_corners_2h,
                    h_yc_ft, a_yc_ft, h_yc_1h, a_yc_1h, h_yc_2h, a_yc_2h
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,
                    $10,$11,$12,$13,$14,$15,$16,
                    $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,
                    $32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53,$54,$55,
                    $56,$57,$58,$59,$60,$61,$62,$63,$64,$65,$66,$67
                )
                ON CONFLICT (source_id, source_league) DO UPDATE SET
                    v3_fixture_id = EXCLUDED.v3_fixture_id,
                    fthg = EXCLUDED.fthg, ftag = EXCLUDED.ftag, ftr = EXCLUDED.ftr,
                    hg_1h = EXCLUDED.hg_1h, ag_1h = EXCLUDED.ag_1h, hg_2h = EXCLUDED.hg_2h, ag_2h = EXCLUDED.ag_2h,
                    odds_h = EXCLUDED.odds_h, odds_d = EXCLUDED.odds_d, odds_a = EXCLUDED.odds_a,
                    odds_o05=EXCLUDED.odds_o05, odds_u05=EXCLUDED.odds_u05,
                    odds_o15=EXCLUDED.odds_o15, odds_u15=EXCLUDED.odds_u15,
                    odds_o25=EXCLUDED.odds_o25, odds_u25=EXCLUDED.odds_u25,
                    odds_o35=EXCLUDED.odds_o35, odds_u35=EXCLUDED.odds_u35,
                    odds_o45=EXCLUDED.odds_o45, odds_u45=EXCLUDED.odds_u45,
                    odds_btts_y=EXCLUDED.odds_btts_y, odds_btts_n=EXCLUDED.odds_btts_n,
                    h_bp_ft=EXCLUDED.h_bp_ft, a_bp_ft=EXCLUDED.a_bp_ft,
                    h_ts_ft=EXCLUDED.h_ts_ft, a_ts_ft=EXCLUDED.a_ts_ft,
                    h_son_ft=EXCLUDED.h_son_ft, a_son_ft=EXCLUDED.a_son_ft,
                    h_soff_ft=EXCLUDED.h_soff_ft, a_soff_ft=EXCLUDED.a_soff_ft,
                    h_corners_ft=EXCLUDED.h_corners_ft, a_corners_ft=EXCLUDED.a_corners_ft,
                    h_yc_ft=EXCLUDED.h_yc_ft, a_yc_ft=EXCLUDED.a_yc_ft,
                    imported_at = NOW()
            `, [
                id, league.name, league.country, o.Season || ov.Season,
                matchDate.toISOString(), homeTeam, awayTeam, ov.referee || null, fixture.fixture_id,
                // Scores
                n(ov.FTHG ?? s.FTHG), n(ov.FTAG ?? s.FTAG), (ov.FTR || s.FTR || null),
                n(s['1HHG']), n(s['1HAG']), n(s['2HHG']), n(s['2HAG']),
                // Odds
                n(o.H), n(o.D), n(o.A),
                n(o.O05), n(o.U05), n(o.O15), n(o.U15), n(o.O25), n(o.U25),
                n(o.O35), n(o.U35), n(o.O45), n(o.U45), n(o.BTTSY), n(o.BTTSN),
                // Attack & Possession
                n(at.HBPFT), n(at.ABPFT), n(at.HBP1H), n(at.ABP1H), n(at.HBP2H), n(at.ABP2H),
                n(at.HTSFT), n(at.ATSFT), n(at.HTS1H), n(at.ATS1H), n(at.HTS2H), n(at.ATS2H),
                n(at.HSONFT), n(at.ASONFT), n(at.HSON1H), n(at.ASON1H), n(at.HSON2H), n(at.ASON2H),
                n(at.HSOFFFT), n(at.ASOFFFT), n(at.HSOFF1H), n(at.ASOFF1H), n(at.HSOFF2H), n(at.ASOFF2H),
                // Corners & Cards
                n(cc.HCFT), n(cc.ACFT), n(cc.HC1H), n(cc.AC1H), n(cc.HC2H), n(cc.AC2H),
                n(cc.HYCFT), n(cc.AYCFT), n(cc.HYC1H), n(cc.AYC1H), n(cc.HYC2H), n(cc.AYC2H)
            ]);
            inserted++;
        } catch (err) {
            logger.error({ err, id, homeTeam, awayTeam }, `🔥 Insert error`);
            skipped++;
        }
    }

    logger.info(`✅ ${league.name}: ${inserted} inserted, ${skipped} skipped`);
    return { inserted, skipped };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function run() {
    await db.init();
    logger.info('🚀 Starting ML Matches Import (V29)');

    let totalInserted = 0, totalSkipped = 0;
    for (const league of LEAGUES) {
        const { inserted, skipped } = await importLeague(league);
        totalInserted += inserted;
        totalSkipped  += skipped;
    }

    logger.info(`🎉 Done — ${totalInserted} matches imported, ${totalSkipped} skipped`);
    process.exit(0);
}

run().catch(err => {
    logger.error({ err }, '❌ Fatal error');
    process.exit(1);
});
