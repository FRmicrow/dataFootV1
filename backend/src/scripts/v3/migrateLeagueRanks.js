import db from '../../config/database.js';
import { CompetitionRanker } from '../../utils/v3/CompetitionRanker.js';

async function migrate() {
    console.log("🚀 Starting League Rank Migration...");
    await db.init();

    const leagues = db.all(`
        SELECT l.league_id, l.name, l.type, c.name as country_name 
        FROM V3_Leagues l
        LEFT JOIN V3_Countries c ON l.country_id = c.country_id
    `);

    console.log(`📊 Found ${leagues.length} leagues to process.`);

    db.run("BEGIN TRANSACTION");
    try {
        let updatedCount = 0;
        for (const league of leagues) {
            const rank = CompetitionRanker.calculate({
                name: league.name,
                type: league.type,
                country_name: league.country_name
            });

            db.run("UPDATE V3_Leagues SET importance_rank = ? WHERE league_id = ?", [rank, league.league_id]);
            updatedCount++;

            if (updatedCount % 50 === 0) {
                console.log(`   ✅ Processed ${updatedCount}/${leagues.length}...`);
            }
        }
        db.run("COMMIT");
        console.log(`🎉 Success! Updated ${updatedCount} league ranks.`);
    } catch (err) {
        db.run("ROLLBACK");
        console.error("❌ Migration failed:", err);
    }
}

migrate().catch(console.error);
