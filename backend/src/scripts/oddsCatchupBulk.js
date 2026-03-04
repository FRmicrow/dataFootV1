import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import OddsService from '../services/odds/OddsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function runBulkCatchup() {
    console.log("🚀 Starting Bulk Odds Catchup...");

    try {
        // Find all league/season pairs currently in the fixtures table
        const pairs = db.all(`
            SELECT DISTINCT league_id, season_year 
            FROM V3_Fixtures 
            ORDER BY season_year DESC, league_id ASC
        `);

        console.log(`📊 Found ${pairs.length} league/season combinations to check.`);

        for (const pair of pairs) {
            console.log(`\n--- Processing League ${pair.league_id} | Season ${pair.season_year} ---`);
            try {
                const results = await OddsService.importOddsByLeagueSeason(pair.league_id, pair.season_year);
                console.log(`✅ Finished: ${results.inserted} inserted, ${results.updated} updated.`);
            } catch (error) {
                console.error(`❌ Error importing odds for L${pair.league_id}/S${pair.season_year}:`, error.message);
            }

            // Avoid hitting API rate limits too hard (1sec pause between leagues)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log("\n✨ Bulk Odds Catchup completed.");
        process.exit(0);
    } catch (error) {
        console.error("💥 Fatal error during bulk catchup:", error);
        process.exit(1);
    }
}

runBulkCatchup();
