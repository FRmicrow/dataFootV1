import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import db from './src/config/database.js';

async function repair() {
    try {
        await db.init();

        console.log('🛠️ Starting European Competition Data Remapping...');

        const mappings = [
            { oldId: 49, newId: 1475, name: 'Champions League' },
            { oldId: 53, newId: 1476, name: 'Europa League' },
            // Add more if found
        ];

        for (const m of mappings) {
            console.log(`\n📦 Processing ${m.name}: ${m.oldId} -> ${m.newId}`);

            // 1. Remap Fixtures
            const fixturesRes = await db.run(`
                UPDATE V3_Fixtures 
                SET league_id = $1 
                WHERE league_id = $2
            `, [m.newId, m.oldId]);
            console.log(`✅ Remapped ${fixturesRes.changes} fixtures.`);

            // 2. Remap Standings (only if they don't already exist for the newId to avoid duplicates)
            // But we already saw that 1475 has 2025 standings.
            // Let's Move everything but avoid Primary Key/Unique violations if any.
            // Standings table doesn't have a unique constraint on league_id, season, team, rank? 
            // Usually group_name is also involved.

            const standingsRes = await db.run(`
                UPDATE V3_Standings 
                SET league_id = $1 
                WHERE league_id = $2
                AND NOT EXISTS (
                    SELECT 1 FROM V3_Standings s2 
                    WHERE s2.league_id = $1 
                    AND s2.season_year = V3_Standings.season_year 
                    AND s2.team_id = V3_Standings.team_id 
                    AND s2.group_name = V3_Standings.group_name
                )
            `, [m.newId, m.oldId]);
            console.log(`✅ Remapped ${standingsRes.changes} unique standings rows.`);

            // 3. Remap Player Stats
            const statsRes = await db.run(`
                UPDATE V3_Player_Stats 
                SET league_id = $1 
                WHERE league_id = $2
                AND NOT EXISTS (
                    SELECT 1 FROM V3_Player_Stats ps2 
                    WHERE ps2.league_id = $1 
                    AND ps2.season_year = V3_Player_Stats.season_year 
                    AND ps2.player_id = V3_Player_Stats.player_id 
                    AND ps2.team_id = V3_Player_Stats.team_id
                )
            `, [m.newId, m.oldId]);
            console.log(`✅ Remapped ${statsRes.changes} unique player stats rows.`);

            // 4. Update Import Flags
            await db.run(`
                UPDATE V3_League_Seasons
                SET imported_fixtures = true, imported_standings = true, imported_players = true
                WHERE league_id = $1
            `, [m.newId]);
            console.log(`✅ Updated import flags for league ${m.newId}.`);
        }

        console.log('\n🎉 Repair Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Repair Failed:', error);
        process.exit(1);
    }
}

repair();
