import 'dotenv/config';
import db from '../../src/config/database.js';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_DIR = `/app/externalData/ExtractionDone/CoveredLeague/done/Ligue1FixtureDetail/${SEASON}-2010`;

async function discoverTeamsAndPlayers() {
    try {
        await db.init();
        const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json'));
        console.log(`Analyzing ${files.length} files...`);

        const teamsSet = new Set();
        const playersByTeam = {}; // teamName -> Set of playerNames

        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'));
            const home = data.scorebox.home_team;
            const away = data.scorebox.away_team;

            teamsSet.add(home);
            teamsSet.add(away);

            if (!playersByTeam[home]) playersByTeam[home] = new Set();
            if (!playersByTeam[away]) playersByTeam[away] = new Set();

            // Extract players from lineups
            if (data.lineups) {
                if (data.lineups.home && data.lineups.home.players) {
                    data.lineups.home.players.forEach(p => playersByTeam[home].add(p.name));
                }
                if (data.lineups.home && data.lineups.home.remplacants) {
                    data.lineups.home.remplacants.forEach(p => playersByTeam[home].add(p.name));
                }
                if (data.lineups.away && data.lineups.away.players) {
                    data.lineups.away.players.forEach(p => playersByTeam[away].add(p.name));
                }
                if (data.lineups.away && data.lineups.away.remplacants) {
                    data.lineups.away.remplacants.forEach(p => playersByTeam[away].add(p.name));
                }
            }
        }

        const teams = Array.from(teamsSet).sort();
        console.log(`\nFound ${teams.length} unique teams:`);

        const analysis = [];
        for (const teamName of teams) {
            // Check DB for potential matches
            const existing = await db.all("SELECT team_id, name, country FROM v3_teams WHERE name ILIKE $1", [`%${teamName}%`]);
            const exact = existing.find(t => t.name.toLowerCase() === teamName.toLowerCase());
            
            analysis.push({
                sourceName: teamName,
                playerCount: playersByTeam[teamName].size,
                existing: existing.map(e => ({ id: e.team_id, name: e.name, country: e.country })),
                matchStatus: exact ? 'EXACT' : (existing.length > 0 ? 'PARTIAL' : 'MISSING')
            });
        }

        console.log(JSON.stringify(analysis, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

discoverTeamsAndPlayers();
