
import db from '../config/database.js';
import { runImportJob } from '../services/v3/leagueImportService.js';
import mlService from '../services/v3/mlService.js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const sendLog = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
};

async function sync() {
    try {
        console.log('--- Starting Europa League Sync ---');
        await db.init();
        
        const leagueApiId = 3; // UEFA Europa League
        const season = 2025;
        
        await runImportJob(leagueApiId, season, sendLog, { forceApiId: true, forceRefresh: true });
        
        console.log('--- Generating Predictions for Upcoming Matches ---');
        const upcomingFixtures = await db.all(`
            SELECT f.fixture_id, ht.name as home, at.name as away
            FROM V3_Fixtures f
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            WHERE l.api_id = ? AND f.season_year = ? AND f.status_short = 'NS'
            AND f.date >= NOW()
        `, [leagueApiId, season]);
        
        console.log(`[INFO] Found ${upcomingFixtures.length} upcoming matches. Generating predictions...`);
        
        for (const fixture of upcomingFixtures) {
            try {
                console.log(`[ML] Predicting ${fixture.home} vs ${fixture.away} (${fixture.fixture_id})...`);
                await mlService.predictFixtureAll(fixture.fixture_id);
            } catch (pErr) {
                console.warn(`[WARN] Prediction failed for ${fixture.fixture_id}: ${pErr.message}`);
            }
        }
        
        console.log('--- Sync and Predictions Completed Successfully ---');
        process.exit(0);
    } catch (err) {
        console.error('--- Sync Failed ---');
        console.error(err);
        process.exit(1);
    }
}

sync();
