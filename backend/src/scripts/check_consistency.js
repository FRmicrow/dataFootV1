import database from '../config/database.js';

const run = async () => {
    console.log("🚀 Starting Player Consistency Check...");

    // Initialize Database
    const dbInstance = await database.init();

    // 1. Ensure 'fully_imported' column exists
    try {
        database.all("SELECT fully_imported FROM V2_players LIMIT 1");
    } catch (e) {
        console.log("⚠️ 'fully_imported' column missing. Adding it...");
        try {
            // Use dbInstance.run to avoid saving immediately, though for schema change saving is fine.
            // But here we want to ensure it's saved so we can use it.
            // Actually, we can use the wrapper run for this to be safe and persistent.
            database.run("ALTER TABLE V2_players ADD COLUMN fully_imported BOOLEAN DEFAULT 0");
            console.log("✅ Column 'fully_imported' added.");
        } catch (alterErr) {
            console.error("❌ Failed to add column:", alterErr.message);
            return;
        }
    }

    // 2. Fetch all players with API_ID
    const players = database.all("SELECT player_id, api_id, first_name, last_name, fully_imported FROM V2_players WHERE api_id IS NOT NULL ORDER BY api_id");
    console.log(`📋 Found ${players.length} players to check.`);

    let updatedCount = 0;
    let consistentCount = 0;
    let skippedCount = 0;

    // 3. Iterate and Check Consistency
    for (const player of players) {
        // Fetch years for the player
        const stats = database.all("SELECT DISTINCT year FROM V2_player_statistics WHERE player_id = ? ORDER BY year ASC", [player.player_id]);

        if (stats.length === 0) {
            // No stats, cannot be consistent in terms of "start to end"
            continue;
        }

        const years = stats.map(s => s.year);
        const minYear = years[0];
        const maxYear = years[years.length - 1];
        const expectedCount = maxYear - minYear + 1;

        // Check if we have all years in the range
        // Since we ordered by year ASC and selected DISTINCT, 
        // if the count matches the range size, it implies no gaps.
        // Example: 2001, 2002, 2003. Count = 3. Range = 2003 - 2001 + 1 = 3. Match.
        // Example: 2001, 2003. Count = 2. Range = 2003 - 2001 + 1 = 3. Mismatch.

        const isConsistent = years.length === expectedCount;

        if (isConsistent) {
            consistentCount++;
            if (player.fully_imported !== 1) {
                // Update the flag
                // Use dbInstance.run to avoid saving to disk on every update
                dbInstance.run("UPDATE V2_players SET fully_imported = 1 WHERE player_id = ?", [player.player_id]);
                updatedCount++;
                // console.log(`✅ [${player.api_id}] ${player.first_name} ${player.last_name} is consistent (${minYear}-${maxYear}). Flagged.`);
            } else {
                skippedCount++;
            }
        } else {
            // console.log(`❌ [${player.api_id}] ${player.first_name} ${player.last_name} has gaps (Found: ${years.length}, Expected: ${expectedCount}).`);
        }

        if ((consistentCount + updatedCount + skippedCount) % 100 === 0) {
            process.stdout.write(`\rPropgress: Checked ${consistentCount + skippedCount + (players.length - consistentCount - skippedCount)} / ${players.length}`);
        }
    }

    console.log("\n💾 Saving changes to database...");
    database.save();

    console.log("🎉 Consistency Check Complete!");
    console.log(`- Total Players Checked: ${players.length}`);
    console.log(`- Consistent Data: ${consistentCount}`);
    console.log(`- Newly Flagged: ${updatedCount}`);
    console.log(`- Already Flagged: ${skippedCount}`);
};

run().catch(err => {
    console.error("❌ Fatal Error:", err);
});
