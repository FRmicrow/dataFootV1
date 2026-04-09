export const up = async (db) => {
    // V3_Leagues: Add importance_rank column if it doesn't exist
    try {
        const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='V3_Leagues' AND table_schema='public'");
        if (tableExists) {
            await db.run("ALTER TABLE V3_Leagues ADD COLUMN importance_rank INTEGER DEFAULT 999");
            console.log("✅ Added importance_rank column to V3_Leagues");
        }
    } catch (e) {
        if (!e.message.includes('already exists')) {
            console.warn("⚠️ Error adding importance_rank to V3_Leagues:", e.message);
        }
    }
};
