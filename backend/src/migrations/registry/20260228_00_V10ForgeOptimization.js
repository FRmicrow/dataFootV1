export const up = async (db) => {
    // 1. Add columns to V3_Forge_Simulations
    const columns = [
        { name: 'last_heartbeat', type: 'TIMESTAMPTZ' },
        { name: 'error_log', type: 'TEXT' },
        { name: 'stage', type: 'TEXT' }
    ];

    for (const col of columns) {
        try {
            // Check if table exists first
            const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='V3_Forge_Simulations' AND table_schema='public'");
            if (tableExists) {
                await db.run(`ALTER TABLE V3_Forge_Simulations ADD COLUMN ${col.name} ${col.type}`);
            }
        } catch (e) {
            if (!e.message.includes('already exists')) throw e;
        }
    }

};
