import db from '../src/config/database.js';

async function clearData() {
    try {
        console.log("Initializing database...");
        await db.init();

        console.log("Clearing V2_player_statistics...");
        db.run("DELETE FROM V2_player_statistics");

        console.log("Clearing V2_player_club_history...");
        db.run("DELETE FROM V2_player_club_history");

        console.log("Clearing V2_players...");
        db.run("DELETE FROM V2_players");

        // Optional: Vacuum to reclaim space? sql.js might not support it well or it might be slow.
        // db.run("VACUUM"); 

        console.log("✅ Data cleared successfully.");
    } catch (error) {
        console.error("Error clearing data:", error);
        process.exit(1);
    }
}

clearData();
