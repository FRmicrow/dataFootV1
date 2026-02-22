import db from '../../config/database.js';
import { ResolutionService } from '../../services/v3/ResolutionService.js';

async function testResolution() {
    console.log("🔍 Scanning for duplicate candidates...");
    await db.init();

    // Find some exact Name + DOB matches first as low hanging fruit
    const suspicious = db.all(`
        SELECT name, birth_date, COUNT(*) as c 
        FROM V3_Players 
        GROUP BY name, birth_date 
        HAVING c > 1 AND birth_date IS NOT NULL AND birth_date != ''
        LIMIT 5
    `);

    for (const group of suspicious) {
        console.log(`\n👥 Analyzing group: ${group.name} (${group.birth_date})`);
        const plys = db.all("SELECT * FROM V3_Players WHERE name = ? AND birth_date = ?", [group.name, group.birth_date]);

        for (let i = 0; i < plys.length; i++) {
            for (let j = i + 1; j < plys.length; j++) {
                const confidence = ResolutionService.calculateConfidence(plys[i], plys[j]);
                console.log(`   - Confidence between ID ${plys[i].player_id} and ${plys[j].player_id}: ${confidence}%`);

                if (confidence >= 80) {
                    console.log(`   🚀 EXECUTE MERGE RECOMMENDED`);
                    // ResolutionService.performMerge(plys[i].player_id, plys[j].player_id);
                }
            }
        }
    }
}

testResolution().catch(console.error);
