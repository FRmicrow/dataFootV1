import dotenv from 'dotenv';
dotenv.config();

import dbV3 from '../src/config/database_v3.js';
import { runImportJob } from '../src/controllers/v3/importControllerV3.js';

const LIGUE_1_LEAGUE_ID = 1; // Local ID for Ligue 1 (France)
const LIGUE_1_API_ID = 61;
const SEASONS = [
    2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017,
    2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
];

const wipeAndReimport = async () => {
    console.log(`🚀 Starting Global Wipe & Re-import for Ligue 1 (ID: ${LIGUE_1_LEAGUE_ID}, API: ${LIGUE_1_API_ID})...`);
    await dbV3.init();

    // 1. Double check the league
    const league = dbV3.get("SELECT * FROM V3_Leagues WHERE league_id = ?", [LIGUE_1_LEAGUE_ID]);
    if (!league || league.api_id !== LIGUE_1_API_ID) {
        console.error(`❌ League ID ${LIGUE_1_LEAGUE_ID} does not match API ID ${LIGUE_1_API_ID} or is missing.`);
        process.exit(1);
    }

    console.log(`🧹 Wiping all local data for Ligue 1...`);

    dbV3.run("BEGIN TRANSACTION");
    try {
        // Delete Stats
        dbV3.run("DELETE FROM V3_Player_Stats WHERE league_id = ?", [LIGUE_1_LEAGUE_ID]);

        // Delete Standings
        dbV3.run("DELETE FROM V3_Standings WHERE league_id = ?", [LIGUE_1_LEAGUE_ID]);

        // Delete Fixtures (Events will cascade if ON DELETE CASCADE is set, 
        // but we'll be safer if we check schema, however runImportJob handlesFixtures)
        dbV3.run("DELETE FROM V3_Fixtures WHERE league_id = ?", [LIGUE_1_LEAGUE_ID]);

        // Delete Season Trackers
        dbV3.run("DELETE FROM V3_League_Seasons WHERE league_id = ?", [LIGUE_1_LEAGUE_ID]);

        dbV3.run("COMMIT");
        console.log("✅ Local data wiped successfully.");
    } catch (err) {
        dbV3.run("ROLLBACK");
        console.error("❌ Failed to wipe data:", err);
        process.exit(1);
    }

    // 2. Re-import each season
    const sendLog = (msg, type) => {
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${msg}`);
    };

    for (const season of SEASONS) {
        console.log(`\n📅 Starting Import for Season ${season}...`);
        try {
            await runImportJob(LIGUE_1_LEAGUE_ID, season, sendLog);
            console.log(`✅ Finished Season ${season}.`);
        } catch (err) {
            console.error(`❌ Global error importing season ${season}:`, err.message);
        }
    }

    console.log('\n🎉 Global Re-import of Ligue 1 complete!');
    dbV3.save(true);
};

wipeAndReimport().catch(console.error);
