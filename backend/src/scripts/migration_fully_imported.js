import db from '../config/database.js';

console.log("Running migration...");

(async () => {
    try {
        await db.init();

        // 1. Add Column
        try {
            db.run("ALTER TABLE V2_players ADD COLUMN fully_imported INTEGER DEFAULT 0");
            console.log("✅ Column 'fully_imported' added.");
        } catch (e) {
            console.log("ℹ️ Column likely exists:", e.message);
        }

        // 2. Set Initial Flag for 1-3000
        try {
            db.run("UPDATE V2_players SET fully_imported = 1 WHERE api_id <= 3000");
            console.log(`✅ Updated players (API ID <= 3000) to fully_imported = 1.`);
        } catch (e) { console.error("Error update 1:", e); }

        // 3. Ensure others are 0
        try {
            db.run("UPDATE V2_players SET fully_imported = 0 WHERE api_id > 3000");
            console.log(`✅ Updated players (API ID > 3000) to fully_imported = 0.`);
        } catch (e) { console.error("Error update 2:", e); }

    } catch (err) {
        console.error("Migration failed:", err);
    }
})();
