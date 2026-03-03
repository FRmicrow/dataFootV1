import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.env.DATABASE_PATH = path.join(__dirname, '../data/database.sqlite');

import db from '../src/config/database.js';
import OddsCrawlerService from '../src/services/v3/OddsCrawlerService.js';

async function testSync() {
    await db.init();

    // Premier League Fixture (March 2 2026) -> Within 7-day window
    // api_id: 1516254
    const fixtureId = 274859;
    const apiId = 1516254;

    console.log(`🧪 Testing sync for Premier League fixture ${fixtureId} (API ${apiId})...`);

    const success = await OddsCrawlerService._syncFixtureOdds(fixtureId, apiId);

    if (success) {
        console.log('✅ Sync successful! Checking database...');
        const rows = db.all(`
            SELECT market_name, label, odd_value, handicap 
            FROM V3_Odds_Selections 
            WHERE fixture_id = ?
            LIMIT 20
        `, [fixtureId]);

        console.log(`📊 Found ${rows.length} selections stored.`);
        console.table(rows);
    } else {
        console.log('❌ Sync failed (might be no odds available yet or API error).');
    }
}

testSync().catch(err => console.error(err));
