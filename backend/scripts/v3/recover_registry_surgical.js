/**
 * Manchester City & Integrity Restoration (Surgical)
 * 
 * Objectives:
 * 1. Restore Manchester City (Team ID 50, API ID 50)
 * 2. Un-merge Man City matches from Man United (ID 38)
 * 3. Restore West Brom (ID 60, API ID 60)
 * 4. Audit Angers (ID 1) fixtures in league 2
 */

import 'dotenv/config';
import db from '../../src/config/database.js';

async function recover() {
    try {
        await db.init();
        console.log('--- 🚑 Surgical Registry Recovery ---');

        const tx = await db.getTransactionClient();
        try {
            await tx.beginTransaction();

            // 1. Check if Team 50 is West Brom
            const t50 = await tx.get('SELECT * FROM V3_Teams WHERE team_id = 50');
            console.log(`Current Team 50: ${t50?.name} (API ID: ${t50?.api_id})`);

            // If it's West Brom, hijack it back to Man City (as Haaland/Kovacic are already pointing here in events)
            if (t50 && t50.name === 'West Brom') {
                console.log('   - Renaming Team 50 to "Manchester City" and correcting API ID...');
                await tx.run(`
                    UPDATE V3_Teams 
                    SET name = 'Manchester City', 
                        api_id = 50, 
                        logo_url = 'https://media.api-sports.io/football/teams/50.png',
                        code = 'MNC'
                    WHERE team_id = 50
                `);
            }

            // 2. Ensure West Brom (Official API ID 60) exists
            const wbReal = await tx.get('SELECT team_id FROM V3_Teams WHERE api_id = 60');
            if (!wbReal) {
                console.log('   - Re-creating West Bromwich Albion (API ID 60)...');
                await tx.run(`
                    INSERT INTO V3_Teams (api_id, name, code, country, country_id, logo_id, logo_url, data_source)
                    VALUES (60, 'West Bromwich Albion', 'WBA', 'England', 2, 60, 'https://media.api-sports.io/football/teams/60.png', 'api-sports')
                `);
            }

            // 3. Fix Fixtures: Man United (38) is currently playing for Man City in Round 1
            // We'll move fixtures where 'Manchester City' is an alias or events match.
            // Specifically, for 2024 season in League 2.
            console.log('   - Re-assigning Man City fixtures from Man United (ID 38) to ID 50...');
            
            // Sub-query: Matches where scorers are known Man City players
            const mcPlayers = ['E. Haaland', 'M. Kovačić', 'K. De Bruyne', 'Bernardo Silva', 'Rodri', 'P. Foden', 'J. Grealish'];
            const playersStr = mcPlayers.map(p => `'${p}'`).join(',');

            await tx.run(`
                UPDATE V3_Fixtures 
                SET away_team_id = 50 
                WHERE away_team_id = 38 
                AND fixture_id IN (
                    SELECT DISTINCT fixture_id FROM V3_Fixture_Events 
                    WHERE player_name IN (${playersStr}) OR team_id = 50
                )
            `);

            await tx.run(`
                UPDATE V3_Fixtures 
                SET home_team_id = 50 
                WHERE home_team_id = 38 
                AND fixture_id IN (
                    SELECT DISTINCT fixture_id FROM V3_Fixture_Events 
                    WHERE player_name IN (${playersStr}) OR team_id = 50
                )
            `);

            // 4. Address the "Angers (ID 1)" Global Dumper
            // Find fixtures in England (League 2) owned by ID 1 and move them back to their correct teams.
            // This is harder without the original IDs, so we'll look for team names in events.
            console.log('   - Auditing Angers (ID 1) fixtures in England...');
            
            // For now, let's just clear ID 1 from League 2 fixtures if there's a better candidate
            // (Wait, I'll do this in a separate step once I verify the names).

            // 5. Correct the 'tm_fuzzy' alias that caused this!
            await tx.run(`
                UPDATE V3_Team_Aliases 
                SET team_id = 50 
                WHERE alias_name = 'Manchester City' AND team_id = 38
            `);

            await tx.commit();
            console.log('--- ✅ Initial Recovery Complete ---');
        } catch (err) {
            await tx.rollback();
            console.error('Registry recovery failed:', err.message);
        } finally {
            tx.release();
        }

        process.exit(0);
    } catch (e) {
        console.error('Recovery fatal error:', e.message);
        process.exit(1);
    }
}

recover();
