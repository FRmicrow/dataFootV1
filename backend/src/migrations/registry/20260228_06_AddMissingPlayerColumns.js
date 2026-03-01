export const up = async (db) => {
    // 1. V3_Players: Add 'position' column
    try {
        const tableExists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='V3_Players'");
        if (tableExists) {
            db.run("ALTER TABLE V3_Players ADD COLUMN position TEXT");
            console.log("✅ Added 'position' column to V3_Players");
        }
    } catch (e) {
        if (!e.message.includes('duplicate column')) throw e;
    }

    // 2. V3_Player_Stats: Add 'games_position' column
    try {
        const tableExists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='V3_Player_Stats'");
        if (tableExists) {
            db.run("ALTER TABLE V3_Player_Stats ADD COLUMN games_position TEXT");
            console.log("✅ Added 'games_position' column to V3_Player_Stats");
        }
    } catch (e) {
        if (!e.message.includes('duplicate column')) throw e;
    }
};
