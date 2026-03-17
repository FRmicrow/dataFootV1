import db from '../../src/config/database.js';
import { CompetitionRanker } from '../../src/utils/v3/CompetitionRanker.js';

async function main() {
    console.log('🚀 Updating Global Importance Ranks for all leagues...');
    
    await db.init();

    const leagues = await db.all(`
        SELECT l.league_id, l.name, l.type, l.importance_rank as league_rank, 
               c.importance_rank as country_rank, c.name as country_name
        FROM V3_Leagues l
        LEFT JOIN V3_Countries c ON l.country_id = c.country_id
    `);

    console.log(`📊 Found ${leagues.length} leagues to process.`);

    let updated = 0;
    for (const league of leagues) {
        const countryRank = league.country_rank || 999;
        const leagueRank = league.league_rank || 3;
        const isCup = CompetitionRanker.detectType(league) === 'Cup';
        
        const globalScore = CompetitionRanker.calculateGlobalScore(
            countryRank, 
            leagueRank, 
            league.name, 
            isCup
        );

        await db.run(
            "UPDATE V3_Leagues SET global_importance_rank = ?, type = ? WHERE league_id = ?",
            [globalScore, isCup ? 'Cup' : 'League', league.league_id]
        );
        updated++;
        
        if (updated % 100 === 0) {
            console.log(`   ...processed ${updated}/${leagues.length}`);
        }
    }

    // SQLite save
    if (typeof db.save === 'function') {
        db.save(true);
    }

    console.log(`\n✅ Done! Updated ${updated} leagues.`);
}

main().catch(console.error);
