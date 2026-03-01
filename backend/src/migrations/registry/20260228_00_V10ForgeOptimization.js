export const up = async (db) => {
    // 1. Add columns to V3_Forge_Simulations
    const columns = [
        { name: 'last_heartbeat', type: 'DATETIME' },
        { name: 'error_log', type: 'TEXT' },
        { name: 'stage', type: 'TEXT' }
    ];

    for (const col of columns) {
        try {
            // Check if table exists first
            const tableExists = db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='V3_Forge_Simulations'");
            if (tableExists) {
                db.run(`ALTER TABLE V3_Forge_Simulations ADD COLUMN ${col.name} ${col.type}`);
            }
        } catch (e) {
            if (!e.message.includes('duplicate column')) throw e;
        }
    }

};
