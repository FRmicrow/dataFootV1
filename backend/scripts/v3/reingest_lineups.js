import 'dotenv/config';
import db from '../../src/config/database.js';
import fs from 'node:fs';
import path from 'node:path';
import { resolveTeamId } from './team_resolver.js';

const LEAGUE_ID = 1;
const SEASON = parseInt(process.argv[2]) || 2009;
const SOURCE_DIR = `/app/externalData/ExtractionDone/CoveredLeague/done/Ligue1FixtureDetail/${SEASON}-${SEASON+1}`;

let teamsCache = [];

const positionMap = {
    'G': 'Goalkeeper',
    'D': 'Defender',
    'M': 'Midfielder',
    'A': 'Attacker',
    'F': 'Attacker',
    'SUB': 'Substitute'
};

// Cache for player lookups to avoid repeated DB queries
const playerCache = new Map();
let missedPlayers = [];

// Normalize accents for comparison
function normalize(str) {
    return str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() ?? '';
}

// Multi-strategy player lookup:
// 1. Exact match
// 2. Normalized (no accents) exact match 
// 3. Last name only match (within team context)
// 4. Cache result
async function lookupPlayer(name, teamId) {
    if (!name) return null;
    const cacheKey = `${name}|${teamId}`;
    if (playerCache.has(cacheKey)) return playerCache.get(cacheKey);

    const normName = normalize(name);

    // Strategy 1: exact match
    let p = await db.get("SELECT player_id, name FROM v3_players WHERE name = $1 LIMIT 1", [name]);

    // Strategy 2: normalize accents
    if (!p) {
        const allMatches = await db.all(`
            SELECT player_id, name FROM v3_players 
            WHERE unaccent(name) = unaccent($1) LIMIT 5
        `, [name]).catch(() => []);
        if (allMatches.length === 1) p = allMatches[0];
        else if (allMatches.length > 1) {
            // Multiple matches - pick by team if we can
            p = allMatches[0];
        }
    }

    // Strategy 3: last name match
    if (!p) {
        const parts = name.trim().split(/\s+/);
        const lastName = parts[parts.length - 1];
        if (lastName && lastName.length > 2) {
            const candidates = await db.all(`
                SELECT player_id, name FROM v3_players 
                WHERE unaccent(lower(name)) LIKE unaccent(lower($1))
                LIMIT 10
            `, [`%${lastName}%`]);

            if (candidates.length === 1) {
                p = candidates[0];
            } else if (candidates.length > 1) {
                // Try to match first initial too
                const firstInitial = parts[0]?.[0]?.toLowerCase();
                if (firstInitial) {
                    const narrowed = candidates.filter(c => normalize(c.name).startsWith(firstInitial));
                    if (narrowed.length === 1) p = narrowed[0];
                    else if (narrowed.length > 0) {
                        // Try full name normalized match
                        const fullNorm = normalize(name);
                        const exact = narrowed.find(c => normalize(c.name) === fullNorm);
                        p = exact || narrowed[0];
                    }
                }
            }
        }
    }

    playerCache.set(cacheKey, p || null);
    if (!p) missedPlayers.push({ name, teamId });
    return p;
}

async function reingestLineups() {
    try {
        await db.init();
        if (teamsCache.length === 0) {
            teamsCache = await db.all("SELECT team_id, name FROM v3_teams");
        }
        await db.run("CREATE EXTENSION IF NOT EXISTS unaccent").catch(() => {});

        const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json')).sort();
        console.log(`Re-ingesting lineups from ${files.length} fixtures...`);

        let processed = 0;
        let playerInserted = 0;
        let playerMissed = 0;

        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'));
            const matchId = parseInt(data._parser.match_id);

            const homeId = await resolveTeamId(data.scorebox.home_team, db, teamsCache);
            const awayId = await resolveTeamId(data.scorebox.away_team, db, teamsCache);

            // 1. Primary Lookup by API ID (Transfermarkt ID)
            let fixture = await db.get("SELECT fixture_id FROM v3_fixtures WHERE api_id = $1", [matchId]);

            // 2. Secondary Lookup by Logical Matchup
            if (!fixture && homeId && awayId) {
                fixture = await db.get(`
                    SELECT fixture_id FROM v3_fixtures 
                    WHERE league_id = $1 AND season_year = $2 AND home_team_id = $3 AND away_team_id = $4
                `, [LEAGUE_ID, SEASON, homeId, awayId]);
            }

            if (!fixture) {
                console.warn(`  Fixture not found for match ${matchId} (${data.scorebox.home_team} vs ${data.scorebox.away_team})`);
                continue;
            }
            const fixtureId = fixture.fixture_id;

            // Clear existing lineup stats for this fixture
            await db.run("DELETE FROM v3_fixture_player_stats WHERE fixture_id = $1", [fixtureId]);

            if (!data.lineups) continue;

            const processLineup = async (side) => {
                const l = data.lineups[side];
                if (!l) return;
                const teamId = await resolveTeamId(l.team, db, teamsCache);
                if (!teamId) return;

                const ingestPlayer = async (p, isStart) => {
                    const dbPlayer = await lookupPlayer(p.name, teamId);
                    if (!dbPlayer) {
                        playerMissed++;
                        return;
                    }
                    const pos = p.role || p.position_code || null;
                    const mappedPos = positionMap[pos] || null;
                    const jersey = p.numero ? parseInt(p.numero) : null;

                    await db.run(`
                        INSERT INTO v3_fixture_player_stats (
                            fixture_id, team_id, player_id, is_start_xi, position, minutes_played
                        ) VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT DO NOTHING
                    `, [fixtureId, teamId, dbPlayer.player_id, isStart, mappedPos, isStart ? 90 : 0]);
                    playerInserted++;
                };

                if (l.titulaires) for (const p of l.titulaires) await ingestPlayer(p, true);
                if (l.remplacants) for (const p of l.remplacants) await ingestPlayer(p, false);
            };

            await processLineup('home');
            await processLineup('away');
            processed++;

            if (processed % 50 === 0) console.log(`  ${processed}/${files.length} done...`);
        }

        console.log(`\nLineup re-ingestion complete!`);
        console.log(`  Fixtures processed: ${processed}`);
        console.log(`  Player rows inserted: ${playerInserted}`);
        console.log(`  Players not found: ${playerMissed}`);

        if (missedPlayers.length > 0) {
            const uniq = [...new Set(missedPlayers.map(m => m.name))].slice(0, 20);
            console.log(`  Sample missed players:`, uniq);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

reingestLineups();
