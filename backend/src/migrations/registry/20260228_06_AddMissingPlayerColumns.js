export const up = async (db) => {
    // 1. V3_Players: Add 'position' column
    try {
        const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='V3_Players' AND table_schema='public'");
        if (tableExists) {
            await db.run("ALTER TABLE V3_Players ADD COLUMN position TEXT");
            console.log("✅ Added 'position' column to V3_Players");
        }
    } catch (e) {
        if (!e.message.includes('already exists')) throw e;
    }

    // 2. V3_Player_Stats: Add 'games_position' column
    try {
        const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='V3_Player_Stats' AND table_schema='public'");
        if (tableExists) {
            await db.run("ALTER TABLE V3_Player_Stats ADD COLUMN games_position TEXT");
            console.log("✅ Added 'games_position' column to V3_Player_Stats");
        }
    } catch (e) {
        if (!e.message.includes('already exists')) throw e;
    }
};
