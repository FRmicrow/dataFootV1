import 'dotenv/config';
import db from '../../src/config/database.js';
import fs from 'node:fs';
import path from 'node:path';

const SEASON = parseInt(process.argv[2]) || 2009;
const SOURCE_DIR = `/app/externalData/ExtractionDone/CoveredLeague/done/Ligue1FixtureDetail/${SEASON}-${SEASON+1}`;

import { resolveTeamId } from './team_resolver.js';

const LEAGUE_ID = 1;

let teamsCache = [];

const monthMap = {
    'janv.': '01', 'fevr.': '02', 'mars': '03', 'avr.': '04', 'mai': '05', 'juin': '06',
    'juil.': '07', 'août': '08', 'sept.': '09', 'oct.': '10', 'nov.': '11', 'déc.': '12',
    'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04', 'mai': '05', 'juin': '06',
    'juillet': '07', 'août': '08', 'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
};

function parseFrenchDate(dateStr) {
    if (!dateStr) return null;
    // Remove day prefix "sam., " or similar
    const cleaned = dateStr.replace(/^[a-z.]+,?\s+/i, ''); 
    
    if (cleaned.includes('/')) {
        const [d, m, y] = cleaned.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
        const parts = cleaned.split(/\s+/); // e.g. "26 août 1950"
        if (parts.length < 3) return null;
        const d = parts[0].padStart(2, '0');
        const m = monthMap[parts[1].toLowerCase()] || '01';
        const y = parts[2];
        return `${y}-${m}-${d}`;
    }
}

async function ingestFixtures() {
    try {
        await db.init();
        const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json')).sort();
        console.log(`Ingesting ${files.length} fixtures...`);

        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'));
            const matchId = parseInt(data._parser.match_id);
            const dateStr = parseFrenchDate(data._parser.date);
            const homeId = await resolveTeamId(data.scorebox.home_team, db, teamsCache);
            const awayId = await resolveTeamId(data.scorebox.away_team, db, teamsCache);
            const roundNum = Math.ceil(parseInt(file.split('_')[0]) / 10);
            const round = `Journée - ${roundNum}`;

            // Create or Update Fixture
            // 1. Primary Lookup by API ID (TM ID)
            let fixture = await db.get("SELECT fixture_id FROM v3_fixtures WHERE api_id = $1", [matchId]);

            // 2. Secondary Lookup by Logical Matchup
            if (!fixture && homeId && awayId) {
                fixture = await db.get(`
                    SELECT fixture_id FROM v3_fixtures 
                    WHERE league_id = $1 AND season_year = $2 AND home_team_id = $3 AND away_team_id = $4
                `, [LEAGUE_ID, SEASON, homeId, awayId]);
            }

            let fixtureId;

            if (fixture) {
                fixtureId = fixture.fixture_id;
                await db.run(`
                    UPDATE v3_fixtures SET
                        api_id = $1,
                        goals_home = $2,
                        goals_away = $3,
                        date = $4,
                        round = $5,
                        league_id = $6,
                        season_year = $7,
                        home_team_id = $8,
                        away_team_id = $9,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE fixture_id = $10
                `, [matchId, data.scorebox.home_goals, data.scorebox.away_goals, dateStr, round, LEAGUE_ID, SEASON, homeId, awayId, fixtureId]);
            } else {
                const res = await db.run(`
                    INSERT INTO v3_fixtures (
                        api_id, league_id, season_year, round, date, 
                        home_team_id, away_team_id, goals_home, goals_away,
                        status_long, status_short
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING fixture_id
                `, [
                    matchId, LEAGUE_ID, SEASON, round, dateStr,
                    homeId, awayId, data.scorebox.home_goals, data.scorebox.away_goals,
                    'Match Finished', 'FT'
                ]);
                fixtureId = res.lastInsertRowid;
            }
            console.log(`Fixture ${matchId} (Journée ${roundNum}): ${data.scorebox.home_team} ${data.scorebox.home_goals}-${data.scorebox.away_goals} ${data.scorebox.away_team} -> ID ${fixtureId}`);

            // 1. Ingest Events
            if (data.events) {
                // Clear existing events for this fixture to avoid duplicates on re-run
                await db.run("DELETE FROM v3_fixture_events WHERE fixture_id = $1", [fixtureId]);
                for (const ev of data.events) {
                    const teamId = await resolveTeamId(data.lineups[ev.side].team, db, teamsCache);
                    let playerId = null;
                    let assistId = null;

                    // Map scorer/player
                    if (ev.joueur || ev.but || ev.joueur_in) {
                        const pName = ev.joueur || ev.but || ev.joueur_in;
                        const p = await db.get("SELECT player_id FROM v3_players WHERE name = $1", [pName]);
                        playerId = p ? p.player_id : null;
                    }

                    // Map assist
                    if (ev.passe) {
                        const a = await db.get("SELECT player_id FROM v3_players WHERE name = $1", [ev.passe]);
                        assistId = a ? a.player_id : null;
                    }

                    await db.run(`
                        INSERT INTO v3_fixture_events (
                            fixture_id, time_elapsed, team_id, player_id, player_name, 
                            assist_id, assist_name, type, detail
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [
                        fixtureId, parseInt(ev.minute), teamId, playerId, ev.joueur || ev.but || ev.joueur_in || ev.joueur_out,
                        assistId, ev.passe || null,
                        ev.type === 'substitution' ? 'subst' : (ev.type === 'card' ? 'Card' : 'Goal'),
                        ev.detail || ev.card_type || ev.goal_type
                    ]);
                }
            }

            // 2. Ingest Player Stats (Lineups)
            if (data.lineups) {
                await db.run("DELETE FROM v3_fixture_player_stats WHERE fixture_id = $1", [fixtureId]);
                const processLineup = async (side) => {
                    const teamId = await resolveTeamId(data.lineups[side].team, db, teamsCache);
                    const l = data.lineups[side];
                    
                    const ingestPlayer = async (p, isStart) => {
                        const dbPlayer = await db.get("SELECT player_id FROM v3_players WHERE name = $1", [p.name]);
                        if (!dbPlayer) return;

                        await db.run(`
                            INSERT INTO v3_fixture_player_stats (
                                fixture_id, team_id, player_id, is_start_xi, position
                            ) VALUES ($1, $2, $3, $4, $5)
                            ON CONFLICT DO NOTHING
                        `, [fixtureId, teamId, dbPlayer.player_id, isStart, p.role || p.position_code]);
                    };

                    if (l.titulaires) {
                        for (const p of l.titulaires) await ingestPlayer(p, true);
                    }
                    if (l.remplacants) {
                        for (const p of l.remplacants) await ingestPlayer(p, false);
                    }
                };
                await processLineup('home');
                await processLineup('away');
            }
        }

        console.log('Ingestion complete!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

ingestFixtures();
