import db from '../config/database.js';

(async () => {
    try {
        await db.init();

        console.log("Resetting flags for players > 3000...");

        // Force reset
        db.run("UPDATE V2_players SET fully_imported = 0 WHERE api_id > 3000");

        // Verify
        const check = db.get("SELECT count(*) as count FROM V2_players WHERE api_id > 3000 AND fully_imported = 1");
        console.log(`Remaining flagged players > 3000: ${check.count}`);

        console.log("✅ Flags reset successfully.");
    } catch (e) {
        console.error("Error:", e);
    }
})();
