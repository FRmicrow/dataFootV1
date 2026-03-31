import 'dotenv/config';
import db from '../../src/config/database.js';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeTeam, resolveTeamId } from './team_resolver.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'import_from_json' });

/**
 * Generic Historical Data Importer
 * Usage: node import_from_json.js --league 1 --season 2009 --path /app/externalData/...
 */

const getArg = (name) => {
    const idx = process.argv.indexOf(name);
    return idx !== -1 ? process.argv[idx + 1] : null;
};

const LEAGUE_ID = parseInt(getArg('--league'));
const SEASON_YEAR = parseInt(getArg('--season'));
const SOURCE_DIR = getArg('--path');
const DRY_RUN = process.argv.includes('--dry-run');

const leagueToCountry = {
    1: 'France',
    2: 'Italy',
    3: 'Spain',
    4: 'Germany',
    5: 'England'
};

const COUNTRY = leagueToCountry[LEAGUE_ID] || 'France';

if (!LEAGUE_ID || !SEASON_YEAR || !SOURCE_DIR) {
    console.log('Usage: node import_from_json.js --league <id> --season <year> --path <path> [--dry-run]');
    process.exit(1);
}

const monthMap = {
    'janv.': '01', 'fevr.': '02', 'mars': '03', 'avr.': '04', 'mai': '05', 'juin': '06',
    'juil.': '07', 'août': '08', 'sept.': '09', 'oct.': '10', 'nov.': '11', 'déc.': '12',
    'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04', 'mai': '05', 'juin': '06',
    'juillet': '07', 'août': '08', 'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
};

function parseFrenchDate(dateStr) {
    if (!dateStr) return null;
    const cleaned = dateStr.replace(/^[a-z.]+,?\s+/i, ''); 
    
    if (cleaned.includes('/')) {
        const [d, m, y] = cleaned.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
        const parts = cleaned.split(/\s+/);
        if (parts.length < 3) return null;
        const d = parts[0].padStart(2, '0');
        const m = monthMap[parts[1].toLowerCase()] || '01';
        const y = parts[2];
        return `${y}-${m}-${d}`;
    }
}

async function runImport() {
    try {
        await db.init();
        if (!fs.existsSync(SOURCE_DIR)) {
            log.error({ path: SOURCE_DIR }, 'Source directory does not exist');
            process.exit(1);
        }

        const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json')).sort();
        log.info({ count: files.length, leagueId: LEAGUE_ID, season: SEASON_YEAR, dryRun: DRY_RUN }, 'Starting batch import');

        let teamsCache = [];
        let fixturesMatched = 0;
        let fixturesSkipped = 0;
        let eventsImported = 0;
        let playerStatsImported = 0;

        for (const file of files) {
            const filePath = path.join(SOURCE_DIR, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const tmMatchId = data._parser.match_id;
            const dateStr = parseFrenchDate(data._parser.date);
            
            const homeTeamName = data.scorebox.home_team;
            const awayTeamName = data.scorebox.away_team;
            
            const homeId = await resolveTeamId(homeTeamName, db, teamsCache, COUNTRY);
            const awayId = await resolveTeamId(awayTeamName, db, teamsCache, COUNTRY);

            if (!homeId || !awayId) {
                log.warn({ file, homeTeamName, awayTeamName }, 'Could not resolve teams, skipping');
                fixturesSkipped++;
                continue;
            }

            // Match existing fixture in V3
            let fixture = await db.get("SELECT fixture_id FROM V3_Fixtures WHERE tm_match_id = $1", [tmMatchId]);
            if (!fixture) {
                fixture = await db.get("SELECT fixture_id FROM V3_Fixtures WHERE api_id = $1", [tmMatchId]);
            }
            if (!fixture && dateStr) {
                // If not found by ID, try teams + date matching
                const query = `
                    SELECT fixture_id FROM V3_Fixtures 
                    WHERE league_id = $1 
                      AND season_year = $2 
                      AND home_team_id = $3 
                      AND away_team_id = $4
                      AND (date::date IS NULL OR date::date BETWEEN ($5::date - INTERVAL '2 days') AND ($5::date + INTERVAL '2 days'))
                      AND (tm_match_id IS NULL OR tm_match_id = $6)
                    ORDER BY tm_match_id DESC NULLS LAST, fixture_id ASC
                    LIMIT 1
                `;
                fixture = await db.get(query, [LEAGUE_ID, SEASON_YEAR, homeId, awayId, dateStr, tmMatchId]);
            }

            if (!fixture) {
                // In Master mode, we create the fixture if it's not found in the skeleton
                const isMaster = process.argv.includes('--master');
                if (isMaster) {
                    log.info({ file, homeId, awayId, tmMatchId }, 'Master Mode: Creating missing fixture');
                    const res = await db.run(`
                        INSERT INTO V3_Fixtures (league_id, season_year, home_team_id, away_team_id, date, tm_match_id, data_source, status_short)
                        VALUES ($1, $2, $3, $4, $5, $6, 'transfermarkt_master', 'FT')
                        RETURNING fixture_id
                    `, [LEAGUE_ID, SEASON_YEAR, homeId, awayId, dateStr, tmMatchId]);
                    
                    fixture = { fixture_id: res.lastInsertRowid };
                } else {
                    log.warn({ file, homeTeamName, awayTeamName, dateStr, tmMatchId }, 'No matching fixture found in DB');
                    fixturesSkipped++;
                    continue;
                }
            }

            const fixtureId = fixture.fixture_id;
            fixturesMatched++;

            if (!DRY_RUN) {
                // 1. Update Fixture metadata
                await db.run(`
                    UPDATE V3_Fixtures SET
                        tm_match_id = $1,
                        data_source = 'transfermarkt',
                        date = $2,
                        home_logo_url = COALESCE(home_logo_url, $3),
                        away_logo_url = COALESCE(away_logo_url, $4),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE fixture_id = $5
                `, [tmMatchId, dateStr, data.scorebox.home_logo_url, data.scorebox.away_logo_url, fixtureId]);

                // 2. Events Ingestion
                await db.run("DELETE FROM V3_Fixture_Events WHERE fixture_id = $1", [fixtureId]);
                if (data.events && data.events.length > 0) {
                    for (const ev of data.events) {
                        const eventTeamId = ev.side === 'home' ? homeId : awayId;
                        const pName = ev.joueur || ev.but || ev.joueur_in;
                        
                        let playerId = null;
                        if (pName) {
                            const p = await db.get("SELECT player_id FROM V3_Players WHERE name = $1", [pName]);
                            playerId = p ? p.player_id : null;
                        }

                        await db.run(`
                            INSERT INTO V3_Fixture_Events (
                                fixture_id, time_elapsed, team_id, player_id, player_name, 
                                type, detail, data_source
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'transfermarkt')
                        `, [
                            fixtureId, parseInt(ev.minute) || 0, eventTeamId, playerId, pName || ev.joueur_out,
                            ev.type === 'substitution' ? 'subst' : (ev.type === 'card' ? 'Card' : 'Goal'),
                            ev.detail || ev.card_type || ev.goal_type
                        ]);
                        eventsImported++;
                    }
                }

                // 3. Player Stats & Lineups
                await db.run("DELETE FROM V3_Fixture_Player_Stats WHERE fixture_id = $1", [fixtureId]);
                
                const processSide = async (side, teamId) => {
                    const l = data.lineups[side];
                    if (!l) return;

                    const coachName = l.entraineur;
                    const formation = l.composition;

                    const ingestList = async (list, isStart) => {
                        for (const p of (list || [])) {
                            let dbPlayer = await db.get("SELECT player_id FROM V3_Players WHERE name = $1", [p.name]);
                            if (!dbPlayer) {
                                const res = await db.run("INSERT INTO V3_Players (name) VALUES ($1) RETURNING player_id", [p.name]);
                                dbPlayer = { player_id: res.lastInsertRowid };
                            }
                            if (dbPlayer) {
                                p.db_id = dbPlayer.player_id;
                                await db.run(`
                                    INSERT INTO V3_Fixture_Player_Stats (
                                        fixture_id, team_id, player_id, is_start_xi, position
                                    ) VALUES ($1, $2, $3, $4, $5)
                                    ON CONFLICT DO NOTHING
                                `, [fixtureId, teamId, dbPlayer.player_id, isStart, p.role || p.position_code]);
                                playerStatsImported++;
                            }
                        }
                    };

                    await ingestList(l.titulaires, true);
                    await ingestList(l.remplacants, false);

                    // Metadata table (JSON blobs for UI)
                    const mapToUI = (list) => (list || []).map(p => ({
                        player: {
                            id: p.db_id,
                            name: p.name,
                            number: p.numero,
                            pos: p.role || p.position_code,
                            grid: p.position_terrain ? `${p.position_terrain.top_pct}:${p.position_terrain.left_pct}` : null
                        }
                    }));

                    await db.run(`
                        INSERT INTO V3_Fixture_Lineups (
                            fixture_id, team_id, coach_name, formation, starting_xi, substitutes
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT(fixture_id, team_id) DO UPDATE SET
                            coach_name = EXCLUDED.coach_name,
                            formation = EXCLUDED.formation,
                            starting_xi = EXCLUDED.starting_xi,
                            substitutes = EXCLUDED.substitutes
                    `, [fixtureId, teamId, coachName, formation, JSON.stringify(mapToUI(l.titulaires)), JSON.stringify(mapToUI(l.remplacants))]);
                };

                await processSide('home', homeId);
                await processSide('away', awayId);
            }
        }

        log.info({
            fixturesMatched,
            fixturesSkipped,
            eventsImported,
            playerStatsImported
        }, 'Batch import completed');

    } catch (error) {
        log.error({ err: error }, 'Batch import failed');
    } finally {
        process.exit();
    }
}

runImport();
