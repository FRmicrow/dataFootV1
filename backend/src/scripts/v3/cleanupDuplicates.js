import db from '../../config/database.js';
import { ResolutionService } from '../../services/v3/ResolutionService.js';

async function performAutoCleanup() {
    console.log("🚀 Starting Automated Entity Resolution Cleanup...");
    await db.init();

    const threshold = 90;

    // Step 1: Find high-confidence candidates
    // To be efficient, we look for Name matches OR DOB matches
    const candidates = db.all(`
        SELECT p1.player_id as id1, p2.player_id as id2, p1.name
        FROM V3_Players p1
        JOIN V3_Players p2 ON p1.name = p2.name AND p1.player_id < p2.player_id
        WHERE p1.birth_date = p2.birth_date OR (p1.api_id = p2.api_id AND p1.api_id IS NOT NULL)
    `);

    console.log(`📊 Found ${candidates.length} potential high-confidence matches based on exact Name + (DOB or API_ID).`);

    let mergedCount = 0;
    for (const pair of candidates) {
        try {
            // Re-fetch to ensure they still exist (might have been merged in previous step)
            const p1 = db.get("SELECT * FROM V3_Players WHERE player_id = ?", [pair.id1]);
            const p2 = db.get("SELECT * FROM V3_Players WHERE player_id = ?", [pair.id2]);

            if (!p1 || !p2) continue;

            const confidence = ResolutionService.calculateConfidence(p1, p2);

            if (confidence >= threshold) {
                console.log(`   🔸 [${confidence}%] Merging ${p1.name} (IDs: ${p1.player_id} & ${p2.player_id})`);
                ResolutionService.performMerge(p1.player_id, p2.player_id);
                mergedCount++;
            }
        } catch (err) {
            console.error(`   ❌ Failed to merge pair ${pair.id1}-${pair.id2}:`, err.message);
        }
    }

    console.log(`\n🎉 Cleanup finished. Merged ${mergedCount} duplicate instances.`);
}

performAutoCleanup().catch(console.error);
