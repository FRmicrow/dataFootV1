/*
 * Verification Script for V4 Logo Historization
 */
import db from '../config/database.js';

async function verify() {
    try {
        await db.init();
        console.log('🧪 Verifying Logo Historization...\n');

        // 1. Get a team ID (e.g. 1.FC Köln or any other)
        const team = await db.get('SELECT team_id, name, logo_url FROM V4_Teams WHERE logo_url IS NOT NULL LIMIT 1');
        if (!team) {
            console.warn('⚠️ No teams with logo found in V4_Teams. Please ensure data is loaded.');
            process.exit(0);
        }
        console.log(`📡 Testing team: ${team.name} (ID: ${team.team_id})`);
        console.log(`🖼️ Original logo: ${team.logo_url}\n`);

        // 2. Insert a dummy logo for 1963-1964 season
        const dummyLogo = 'https://example.com/logo_1963_dummy.png';
        
        // Clean up previous test runs
        await db.run('DELETE FROM V4_Club_Logos WHERE logo_url = $1', [dummyLogo]);
        
        await db.run(`
            INSERT INTO V4_Club_Logos (team_id, logo_url, start_year, end_year)
            VALUES ($1, $2, 1963, 1964)
        `, [team.team_id, dummyLogo]);
        console.log('✅ Inserted dummy logo for period 1963-1964.');

        // 3. Test the temporal query logic for 1963
        const result1963 = await db.get(`
            SELECT 
                COALESCE(
                    (SELECT logo_url FROM V4_Club_Logos 
                     WHERE team_id = $1 
                     AND 1963 BETWEEN start_year AND COALESCE(end_year, 9999)
                     ORDER BY start_year DESC
                     LIMIT 1), 
                    logo_url
                ) as logo
            FROM V4_Teams WHERE team_id = $1
        `, [team.team_id]);

        console.log(`📅 Context: 1963`);
        console.log(`🖼️ Resulting logo: ${result1963.logo}`);
        if (result1963.logo === dummyLogo) {
            console.log('✅ SUCCESS: Historical logo correctly returned!\n');
        } else {
            console.error('❌ FAILURE: Historical logo mismatch.\n');
        }

        // 4. Test the temporal query logic for 2024 (should fall back or find 1900-NULL entry)
        const result2024 = await db.get(`
            SELECT 
                COALESCE(
                    (SELECT logo_url FROM V4_Club_Logos 
                     WHERE team_id = $1 
                     AND 2024 BETWEEN start_year AND COALESCE(end_year, 9999)
                     LIMIT 1), 
                    logo_url
                ) as logo
            FROM V4_Teams WHERE team_id = $1
        `, [team.team_id]);

        console.log(`📅 Context: 2024`);
        console.log(`🖼️ Resulting logo: ${result2024.logo}`);
        
        // If the migration worked, it should find the entry we created from V4_Teams (1900-NULL)
        if (result2024.logo === team.logo_url) {
            console.log('✅ SUCCESS: Modern logo correctly returned (fallback/default)!\n');
        } else {
            console.log('ℹ️ Note: Modern logo differs from V4_Teams.logo_url, which is expected if an entry was specifically created in V4_Club_Logos.\n');
        }

        // Cleanup test data
        await db.run('DELETE FROM V4_Club_Logos WHERE logo_url = $1', [dummyLogo]);
        console.log('🧹 Cleanup complete.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Verification failed:', err);
        process.exit(1);
    }
}

verify();
