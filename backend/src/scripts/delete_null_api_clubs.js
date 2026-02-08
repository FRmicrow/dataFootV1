import db from '../config/database.js';

const run = async () => {
    console.log("🚀 Starting Deletion of Clubs with NULL API ID...");
    try {
        await db.init();

        // Check count
        const result = await db.get("SELECT COUNT(*) as count FROM V2_clubs WHERE api_id IS NULL");
        const count = result ? result.count : 0;

        console.log(`Found ${count} clubs with NULL API ID.`);

        if (count > 0) {
            console.log("Cleaning up related records (Manual Cascade)...");

            // Delete related statistics
            await db.run(`DELETE FROM V2_player_statistics WHERE club_id IN (SELECT club_id FROM V2_clubs WHERE api_id IS NULL)`);
            console.log("- Deleted V2_player_statistics");

            // Delete related history
            await db.run(`DELETE FROM V2_player_club_history WHERE club_id IN (SELECT club_id FROM V2_clubs WHERE api_id IS NULL)`);
            console.log("- Deleted V2_player_club_history");

            // Delete related club trophies
            await db.run(`DELETE FROM V2_club_trophies WHERE club_id IN (SELECT club_id FROM V2_clubs WHERE api_id IS NULL)`);
            console.log("- Deleted V2_club_trophies");

            // Delete related player trophies
            await db.run(`DELETE FROM V2_player_trophies WHERE club_id IN (SELECT club_id FROM V2_clubs WHERE api_id IS NULL)`);
            console.log("- Deleted V2_player_trophies");

            // Delete unresolved competitions
            await db.run(`DELETE FROM V2_unresolved_competitions WHERE club_id IN (SELECT club_id FROM V2_clubs WHERE api_id IS NULL)`);
            console.log("- Deleted V2_unresolved_competitions");

            // Finally delete the clubs
            await db.run(`DELETE FROM V2_clubs WHERE api_id IS NULL`);
            console.log("✅ Deleted clubs.");
        } else {
            console.log("✅ No clubs to delete.");
        }

    } catch (e) {
        console.error("❌ Error:", e);
    }
};

run();
