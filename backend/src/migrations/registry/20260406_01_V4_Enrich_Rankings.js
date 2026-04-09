export const up = async (db) => {
    // Add continent and importance_rank to v4_countries
    try {
        await db.run("ALTER TABLE v4_countries ADD COLUMN IF NOT EXISTS continent TEXT");
        await db.run("ALTER TABLE v4_countries ADD COLUMN IF NOT EXISTS importance_rank INTEGER DEFAULT 999");
        console.log("✅ Added continent and importance_rank columns to v4_countries");
    } catch (e) {
        console.warn("⚠️ Error updating v4_countries:", e.message);
    }

    // Add importance_rank to v4_leagues
    try {
        await db.run("ALTER TABLE v4_leagues ADD COLUMN IF NOT EXISTS importance_rank INTEGER DEFAULT 999");
        console.log("✅ Added importance_rank column to v4_leagues");
    } catch (e) {
        console.warn("⚠️ Error updating v4_leagues:", e.message);
    }

    // Add importance_rank to v4_teams
    try {
        await db.run("ALTER TABLE v4_teams ADD COLUMN IF NOT EXISTS importance_rank INTEGER DEFAULT 999");
        console.log("✅ Added importance_rank column to v4_teams");
    } catch (e) {
        console.warn("⚠️ Error updating v4_teams:", e.message);
    }

    // Add indices
    try {
        await db.run("CREATE INDEX IF NOT EXISTS idx_v4_countries_importance_rank ON v4_countries(importance_rank)");
        await db.run("CREATE INDEX IF NOT EXISTS idx_v4_leagues_importance_rank ON v4_leagues(importance_rank)");
        await db.run("CREATE INDEX IF NOT EXISTS idx_v4_teams_importance_rank ON v4_teams(importance_rank)");
        console.log("✅ Created indices for importance_rank in V4 tables");
    } catch (e) {
        console.warn("⚠️ Error creating indices:", e.message);
    }
};
