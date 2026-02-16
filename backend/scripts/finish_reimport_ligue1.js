import dotenv from 'dotenv';
dotenv.config();

import dbV3 from '../src/config/database_v3.js';
import { runImportJob } from '../src/controllers/v3/importControllerV3.js';

const LIGUE_1_LEAGUE_ID = 1;
const LIGUE_1_API_ID = 61;
const REMAINING_SEASONS = [2023, 2024, 2025];

const finishReimport = async () => {
    console.log(`🚀 Finishing Global Re-import for Ligue 1 (Seasons: ${REMAINING_SEASONS.join(', ')})...`);
    await dbV3.init();

    const sendLog = (msg, type) => {
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${msg}`);
    };

    for (const season of REMAINING_SEASONS) {
        console.log(`\n📅 Starting Import for Season ${season}...`);
        try {
            await runImportJob(LIGUE_1_LEAGUE_ID, season, sendLog);
            console.log(`✅ Finished Season ${season}.`);
            // Adding a small delay between seasons to be safe
            await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
            console.error(`❌ Global error importing season ${season}:`, err.message);
        }
    }

    console.log('\n🎉 Remaining Ligue 1 seasons complete!');
    dbV3.save(true);
};

finishReimport().catch(console.error);
