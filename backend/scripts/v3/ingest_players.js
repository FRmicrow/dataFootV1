import 'dotenv/config';
import db from '../../src/config/database.js';
import fs from 'node:fs';
import path from 'node:path';
import { resolveTeamId } from './team_resolver.js';

const LEAGUE_ID = 1;
const SEASON = parseInt(process.argv[2]) || 2009;
const SOURCE_DIR = `/app/externalData/ExtractionDone/CoveredLeague/done/Ligue1FixtureDetail/${SEASON}-${SEASON+1}`;

let teamsCache = [];

async function ingestPlayers() {
    try {
        await db.init();
        if (teamsCache.length === 0) {
            teamsCache = await db.all("SELECT team_id, name FROM v3_teams");
        }
        const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json'));
        console.log(`Extracting players from ${files.length} files...`);

        const playerByTeam = {}; // teamId -> Set of player names

        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'));
            const processLineup = async (side) => {
                const teamName = data.scorebox[side + '_team'];
                const teamId = await resolveTeamId(teamName, db, teamsCache);
                if (!teamId) return;

                if (!playerByTeam[teamId]) playerByTeam[teamId] = new Set();
                
                if (data.lineups && data.lineups[side]) {
                    const l = data.lineups[side];
                    if (l.titulaires) l.titulaires.forEach(p => playerByTeam[teamId].add(p.name));
                    if (l.remplacants) l.remplacants.forEach(p => playerByTeam[teamId].add(p.name));
                }
            };
            await processLineup('home');
            await processLineup('away');
        }

        console.log('Player extraction complete. Starting DB mapping...');

        let totalNew = 0;
        let totalExisting = 0;

        for (const [teamIdStr, players] of Object.entries(playerByTeam)) {
            const teamId = parseInt(teamIdStr);
            console.log(`Processing team ID ${teamId} (${players.size} players)...`);
            for (const playerName of players) {
                // Search in DB
                let player = await db.get("SELECT player_id FROM v3_players WHERE name = $1", [playerName]);
                
                if (!player) {
                    player = await db.get("SELECT player_id FROM v3_players WHERE unaccent(name) = unaccent($1)", [playerName]).catch(() => null);
                }

                if (!player) {
                    // Create new player
                    const res = await db.run("INSERT INTO v3_players (name) VALUES ($1) RETURNING player_id", [playerName]);
                    player = { player_id: res.lastInsertRowid };
                    totalNew++;
                } else {
                    totalExisting++;
                }

                // Associate with season if not already
                const existsInSeason = await db.get(
                    "SELECT 1 FROM v3_player_season_stats WHERE player_id = $1 AND team_id = $2 AND league_id = $3 AND season_year = $4",
                    [player.player_id, teamId, LEAGUE_ID, SEASON]
                );

                if (!existsInSeason) {
                    await db.run(
                        "INSERT INTO v3_player_season_stats (player_id, team_id, league_id, season_year) VALUES ($1, $2, $3, $4)",
                        [player.player_id, teamId, LEAGUE_ID, SEASON]
                    );
                }
            }
        }

        console.log(`Ingestion complete! New players: ${totalNew}, Existing players: ${totalExisting}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

ingestPlayers();
