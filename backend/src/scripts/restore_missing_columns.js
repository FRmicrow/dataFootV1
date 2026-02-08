import db from '../config/database.js';

const run = async () => {
    console.log("🚀 Checking and restoring schema inconsistencies...");
    try {
        await db.init();

        // 1. Add fully_imported to V2_players
        try {
            // Check if column exists first
            const info = await db.all("PRAGMA table_info(V2_players)");
            const hasCol = info.some(c => c.name === 'fully_imported');

            if (!hasCol) {
                console.log("➕ Adding 'fully_imported' to V2_players...");
                await db.run("ALTER TABLE V2_players ADD COLUMN fully_imported BOOLEAN NOT NULL DEFAULT 0");
                console.log("✅ Success.");
            } else {
                console.log("✓ 'fully_imported' already exists.");
            }
        } catch (e) {
            console.error("❌ Failed to add fully_imported:", e.message);
        }

    } catch (e) {
        console.error("❌ Critical Error:", e);
    }
};

run();
