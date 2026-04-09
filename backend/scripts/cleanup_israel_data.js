import db from '../src/config/database.js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function cleanup() {
    console.log('🧹 Starting Israel data cleanup...');
    
    try {
        await db.init();
        
        // 1. Find Israel Country ID
        const country = await db.get("SELECT country_id FROM V3_Countries WHERE name = 'Israel'");
        if (!country) {
            console.log('ℹ️ Israel not found in V3_Countries. Nothing to clean.');
            process.exit(0);
        }
        
        const countryId = country.country_id;
        console.log(`📍 Found Israel with country_id: ${countryId}`);
        
        // 2. Find associated leagues
        const leagues = await db.all("SELECT league_id, name FROM V3_Leagues WHERE country_id = ?", [countryId]);
        const leagueIds = leagues.map(l => l.league_id);
        
        if (leagueIds.length > 0) {
            console.log(`🏟️ Found ${leagueIds.length} leagues to delete: ${leagues.map(l => l.name).join(', ')}`);
            
            const placeholders = leagueIds.map((_, i) => `$${i + 1}`).join(', ');
            
            // Delete dependent data in order
            console.log('🗑️ Deleting fixtures, standings, and stats...');
            
            // Note: Some tables have ON DELETE CASCADE if defined in schema, but we do it manually to be sure.
            await db.run(`DELETE FROM V3_Fixture_Events WHERE fixture_id IN (SELECT fixture_id FROM V3_Fixtures WHERE league_id IN (${placeholders}))`, leagueIds);
            await db.run(`DELETE FROM V3_Fixture_Stats WHERE fixture_id IN (SELECT fixture_id FROM V3_Fixtures WHERE league_id IN (${placeholders}))`, leagueIds);
            await db.run(`DELETE FROM V3_Fixture_Player_Stats WHERE fixture_id IN (SELECT fixture_id FROM V3_Fixtures WHERE league_id IN (${placeholders}))`, leagueIds);
            await db.run(`DELETE FROM V3_Fixtures WHERE league_id IN (${placeholders})`, leagueIds);
            
            await db.run(`DELETE FROM V3_Standings WHERE league_id IN (${placeholders})`, leagueIds);
            await db.run(`DELETE FROM V3_Player_Season_Stats WHERE league_id IN (${placeholders})`, leagueIds);
            await db.run(`DELETE FROM V3_Player_Stats WHERE league_id IN (${placeholders})`, leagueIds);
            await db.run(`DELETE FROM V3_Trophies WHERE league_id IN (${placeholders})`, leagueIds);
            await db.run(`DELETE FROM V3_Import_Status WHERE league_id IN (${placeholders})`, leagueIds);
            await db.run(`DELETE FROM V3_League_Seasons WHERE league_id IN (${placeholders})`, leagueIds);
            await db.run(`DELETE FROM V3_Leagues WHERE league_id IN (${placeholders})`, leagueIds);
            
            console.log('✅ All league-related data deleted.');
        } else {
            console.log('ℹ️ No leagues found for Israel.');
        }
        
        // 3. Delete Country
        await db.run("DELETE FROM V3_Countries WHERE country_id = ?", [countryId]);
        console.log('✅ Israel country entry deleted.');
        
        console.log('✨ Cleanup completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup failed:', err);
        process.exit(1);
    }
}

cleanup();
