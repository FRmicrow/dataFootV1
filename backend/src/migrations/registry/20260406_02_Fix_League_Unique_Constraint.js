export const up = async (db) => {
    // Drop existing unique constraint on name
    try {
        // Find the constraint name if it's not v4_leagues_name_key (just in case)
        await db.run("ALTER TABLE v4_leagues DROP CONSTRAINT IF EXISTS v4_leagues_name_key");
        console.log("✅ Dropped unique constraint v4_leagues_name_key");
    } catch (e) {
        console.warn("⚠️ Warning dropping constraint:", e.message);
    }

    // Add composite unique constraint (name, country_id)
    try {
        await db.run("ALTER TABLE v4_leagues ADD CONSTRAINT v4_leagues_name_country_unique UNIQUE (name, country_id)");
        console.log("✅ Added composite unique constraint (name, country_id) to v4_leagues");
    } catch (e) {
        console.warn("⚠️ Error adding unique constraint:", e.message);
    }
};

export const down = async (db) => {
    // Revert to unique name (might fail if data is already split)
    try {
        await db.run("ALTER TABLE v4_leagues DROP CONSTRAINT IF EXISTS v4_leagues_name_country_unique");
        await db.run("ALTER TABLE v4_leagues ADD CONSTRAINT v4_leagues_name_key UNIQUE (name)");
    } catch (e) {
        console.warn("⚠️ Error reverting unique constraint:", e.message);
    }
};
