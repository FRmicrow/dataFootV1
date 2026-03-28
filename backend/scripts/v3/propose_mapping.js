import 'dotenv/config';
import db from '../../src/config/database.js';
import fs from 'node:fs';
import path from 'node:path';

const SOURCE_DIR = `/app/externalData/ExtractionDone/CoveredLeague/done/Ligue1FixtureDetail/${SEASON}-2010`;

async function generateMappingProposal() {
    try {
        await db.init();
        const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.json'));
        const teamsSet = new Set();
        for (const file of files) {
            const data = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'));
            teamsSet.add(data.scorebox.home_team);
            teamsSet.add(data.scorebox.away_team);
        }

        const sourceTeams = Array.from(teamsSet).sort();
        const proposal = [];

        for (const st of sourceTeams) {
            // Permissive search
            const keywords = st.split(' ').filter(w => w.length > 3);
            let matches = [];
            if (keywords.length > 0) {
                const query = 'SELECT team_id, name, country FROM v3_teams WHERE ' + 
                              keywords.map((_, i) => 'name ILIKE $' + (i + 1)).join(' OR ');
                matches = await db.all(query, keywords.map(k => '%' + k + '%'));
            } else {
                matches = await db.all('SELECT team_id, name, country FROM v3_teams WHERE name ILIKE $1', ['%' + st + '%']);
            }

            // Heuristic for best match
            let bestMatch = null;
            if (matches.length > 0) {
                // Try exact match first
                bestMatch = matches.find(m => m.name.toLowerCase() === st.toLowerCase());
                if (!bestMatch) {
                    // Try to match core name (e.g. "Lille" in "LOSC Lille")
                    bestMatch = matches.find(m => st.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(st.toLowerCase()));
                }
            }

            proposal.push({
                source: st,
                suggestedId: bestMatch ? bestMatch.team_id : null,
                suggestedName: bestMatch ? bestMatch.name : null,
                allMatches: matches.map(m => m.name + ' (ID: ' + m.team_id + ')')
            });
        }

        console.log(JSON.stringify(proposal, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

generateMappingProposal();
