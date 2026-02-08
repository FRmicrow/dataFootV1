import db from '../config/database.js';

const run = async () => {
    console.log("🚀 Recovering 'fully_imported' flags based on existing data...");

    try {
        await db.init();

        // 1. Get initial cleanup stats
        const totalPlayers = (await db.get("SELECT COUNT(*) as c FROM V2_players")).c;
        const currentDone = (await db.get("SELECT COUNT(*) as c FROM V2_players WHERE fully_imported = 1")).c;

        console.log(`Total Players: ${totalPlayers}`);
        console.log(`Currently Marked Done: ${currentDone}`);

        console.log("Scanning for players with imported statistics...");

        // 2. Perform Update
        // Mark as fully_imported if they have at least one entry in V2_player_statistics
        await db.run(`
            UPDATE V2_players 
            SET fully_imported = 1 
            WHERE fully_imported = 0 
            AND player_id IN (
                SELECT DISTINCT player_id FROM V2_player_statistics
            )
        `);

        // 3. Flag check #2 (Optional: Check physical data presence?)
        // Some players might have no stats (e.g. young players) but were imported.
        // If height/weight/birth_place are present, maybe they are done too?
        // Let's stick to stats as the primary "heavy" import indicator for now.

        // 4. Report results
        const newDone = (await db.get("SELECT COUNT(*) as c FROM V2_players WHERE fully_imported = 1")).c;
        const recovered = newDone - currentDone;

        console.log(`✅ successfully recovered ${recovered} completed players.`);
        console.log(`📊 Final Status: ${newDone} / ${totalPlayers} (${Math.round(newDone / totalPlayers * 100)}%) complete.`);
        console.log(`👉 You can now resume import for the remaining ${totalPlayers - newDone} players.`);

    } catch (e) {
        console.error("❌ Recovery failed:", e);
    }
};

run();
