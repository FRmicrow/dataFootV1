export const up = async (db) => {
    // V3_Leagues: Add importance_rank column if it doesn't exist
    try {
        const tableExists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='V3_Leagues'");
        if (tableExists) {
            db.run("ALTER TABLE V3_Leagues ADD COLUMN importance_rank INTEGER DEFAULT 999");
            console.log("✅ Added importance_rank column to V3_Leagues");
        }
    } catch (e) {
        if (!e.message.includes('duplicate column')) {
            console.warn("⚠️ Error adding importance_rank to V3_Leagues:", e.message);
        }
    }
};
