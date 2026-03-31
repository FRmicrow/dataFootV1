import 'dotenv/config';
import db from '../../src/config/database.js';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeTeam, resolveTeamId } from './team_resolver.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'import_ligue1_2008_pilot' });

const SEASON = 2008;
const LEAGUE_ID = 1;
const SOURCE_DIR = path.resolve(process.cwd(), 'externalData/ExtractionTodo/Ligue1FixtureDetail/2008-2009');

const DRY_RUN = process.argv.includes('--dry-run');

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

async function runPilotImport() {
    try {
        await db.init();
        if (!fs.existsSync(SOURCE_DIR)) {
            log.error({ path: SOURCE_DIR }, 'Source directory does not exist');
            process.exit(1);
        }

        const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json')).sort();
        log.info({ count: files.length, season: SEASON, dryRun: DRY_RUN }, 'Starting pilot import');

        let teamsCache = [];
        let fixturesMatched = 0;
        let fixturesSkipped = 0;
        let eventsImported = 0;
        let lineupsImported = 0;

        for (const file of files) {
            const filePath = path.join(SOURCE_DIR, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const tmMatchId = data._parser.match_id;
            const dateStr = parseFrenchDate(data._parser.date);
            
            const homeTeamName = data.scorebox.home_team;
            const awayTeamName = data.scorebox.away_team;
            
            const homeId = await resolveTeamId(homeTeamName, db, teamsCache);
            const awayId = await resolveTeamId(awayTeamName, db, teamsCache);

            log.info({ file, homeTeamName, awayTeamName, homeId, awayId, dateStr }, 'Resolved teams');

            if (!homeId || !awayId) {
                log.warn({ file, homeTeamName, awayTeamName, homeId, awayId }, 'Could not resolve teams, skipping');
                fixturesSkipped++;
                continue;
            }

            // Match existing fixture
            // Primary: by api_id (since shell uses it for TM IDs)
            let fixture = await db.get("SELECT fixture_id FROM V3_Fixtures WHERE api_id = $1", [tmMatchId]);
            if (fixture) log.info({ fixtureId: fixture.fixture_id, tmMatchId }, 'Matched by api_id');

            // Secondary: by tm_match_id
            if (!fixture) {
                fixture = await db.get("SELECT fixture_id FROM V3_Fixtures WHERE tm_match_id = $1", [tmMatchId]);
                if (fixture) log.info({ fixtureId: fixture.fixture_id, tmMatchId }, 'Matched by tm_match_id');
            }

            // Tertiary: by teams + date (± 1 day window as per spec)
            if (!fixture && dateStr) {
                const query = `
                    SELECT fixture_id FROM V3_Fixtures 
                    WHERE league_id = $1 
                      AND season_year = $2 
                      AND home_team_id = $3 
                      AND away_team_id = $4
                      AND (date::date IS NULL OR date::date BETWEEN ($5::date - INTERVAL '1 day') AND ($5::date + INTERVAL '1 day'))
                `;
                const params = [LEAGUE_ID, SEASON, homeId, awayId, dateStr];
                fixture = await db.get(query, params);
                if (fixture) {
                    log.info({ fixtureId: fixture.fixture_id, homeId, awayId, dateStr }, 'Matched by teams (+ date/null)');
                } else {
                    log.debug({ query, params }, 'Fixture lookup failed');
                }
            }

            if (!fixture) {
                log.warn({ file, homeTeamName, awayTeamName, dateStr, tmMatchId }, 'No matching fixture found in DB');
                fixturesSkipped++;
                continue;
            }

            const fixtureId = fixture.fixture_id;
            fixturesMatched++;

            if (!DRY_RUN) {
                // Enrich Fixture
                await db.run(`
                    UPDATE V3_Fixtures SET
                        tm_match_id = $1,
                        data_source = 'transfermarkt',
                        date = $2,
                        home_logo_url = $3,
                        away_logo_url = $4,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE fixture_id = $5
                `, [tmMatchId, dateStr, data.scorebox.home_logo_url, data.scorebox.away_logo_url, fixtureId]);

                // Import Events
                await db.run("DELETE FROM V3_Fixture_Events WHERE fixture_id = $1", [fixtureId]);
                if (data.events && data.events.length > 0) {
                    for (const ev of data.events) {
                        const eventSideTeam = ev.side === 'home' ? homeTeamName : awayTeamName;
                        const eventTeamId = ev.side === 'home' ? homeId : awayId;
                        
                        let playerId = null;
                        let assistId = null;

                        const pName = ev.joueur || ev.but || ev.joueur_in;
                        if (pName) {
                            const p = await db.get("SELECT player_id FROM V3_Players WHERE name = $1", [pName]);
                            playerId = p ? p.player_id : null;
                        }

                        if (ev.passe) {
                            const a = await db.get("SELECT player_id FROM V3_Players WHERE name = $1", [ev.passe]);
                            assistId = a ? a.player_id : null;
                        }

                        await db.run(`
                            INSERT INTO V3_Fixture_Events (
                                fixture_id, time_elapsed, team_id, player_id, player_name, 
                                assist_id, assist_name, type, detail, data_source
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'transfermarkt')
                        `, [
                            fixtureId, parseInt(ev.minute) || 0, eventTeamId, playerId, pName || ev.joueur_out,
                            assistId, ev.passe || null,
                            ev.type === 'substitution' ? 'subst' : (ev.type === 'card' ? 'Card' : 'Goal'),
                            ev.detail || ev.card_type || ev.goal_type
                        ]);
                        eventsImported++;
                    }
                }

                // 2. Ingest Player Stats (Deep Data - normalized rows for ML)
                await db.run("DELETE FROM V3_Fixture_Player_Stats WHERE fixture_id = $1", [fixtureId]);
                const processPlayerStats = async (side, teamId) => {
                    const l = data.lineups[side];
                    if (!l) return;

                    const ingestPlayer = async (p, isStart) => {
                        let dbPlayer = await db.get("SELECT player_id FROM V3_Players WHERE name = $1", [p.name]);
                        if (!dbPlayer) {
                            const res = await db.run("INSERT INTO V3_Players (name) VALUES ($1) RETURNING player_id", [p.name]);
                            dbPlayer = res?.rows?.[0];
                        }
                        
                        if (!dbPlayer) {
                            log.error({ playerName: p.name }, 'Failed to create or find player');
                            return;
                        }

                        // Attach the ID to the raw object so processLineupMetadata can find it
                        p.db_id = dbPlayer.player_id;

                        await db.run(`
                            INSERT INTO V3_Fixture_Player_Stats (
                                fixture_id, team_id, player_id, is_start_xi, position
                            ) VALUES ($1, $2, $3, $4, $5)
                            ON CONFLICT (fixture_id, player_id) DO NOTHING
                        `, [fixtureId, teamId, dbPlayer.player_id, isStart, p.role || p.position_code]);
                        lineupsImported++;
                    };

                    if (l.titulaires) {
                        for (const p of l.titulaires) await ingestPlayer(p, true);
                    }
                    if (l.remplacants) {
                        for (const p of l.remplacants) await ingestPlayer(p, false);
                    }
                };

                // 3. Ingest Fixture Lineups (UI Table - Coach, Formation, JSON blobs)
                const processLineupMetadata = async (side, teamId) => {
                    const l = data.lineups[side];
                    if (!l) return;

                    const coachName = l.entraineur;
                    const formation = l.composition;
                    
                    const mapPlayers = (players) => {
                        if (!players) return [];
                        return players.map(p => ({
                            player: {
                                id: p.db_id,
                                name: p.name,
                                number: p.numero,
                                pos: p.role || p.position_code,
                                grid: p.position_terrain ? `${p.position_terrain.top_pct}:${p.position_terrain.left_pct}` : null
                            }
                        }));
                    };

                    const startingXI = JSON.stringify(mapPlayers(l.titulaires));
                    const substitutes = JSON.stringify(mapPlayers(l.remplacants));

                    await db.run(`
                        INSERT INTO V3_Fixture_Lineups (
                            fixture_id, team_id, coach_name, formation, starting_xi, substitutes
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT(fixture_id, team_id) DO UPDATE SET
                            coach_name = EXCLUDED.coach_name,
                            formation = EXCLUDED.formation,
                            starting_xi = EXCLUDED.starting_xi,
                            substitutes = EXCLUDED.substitutes
                    `, [fixtureId, teamId, coachName, formation, startingXI, substitutes]);
                };

                await processPlayerStats('home', homeId);
                await processPlayerStats('away', awayId);
                await processLineupMetadata('home', homeId);
                await processLineupMetadata('away', awayId);
            } else {
                log.info({ file, tmMatchId, fixtureId }, 'Dry run: would enrich fixture and import events/lineups/metadata');
            }
        }

        log.info({
            fixturesMatched,
            fixturesSkipped,
            eventsImported,
            lineupsImported,
            dryRun: DRY_RUN
        }, 'Pilot import completed');

    } catch (error) {
        log.error({ err: error }, 'Pilot import failed');
    } finally {
        process.exit();
    }
}

runPilotImport();
