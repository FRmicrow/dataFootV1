export const up = async (db) => {
    console.log('🏗️ Adding missing color columns to V3_Teams...');

    try {
        await db.run('ALTER TABLE V3_Teams ADD COLUMN IF NOT EXISTS secondary_color TEXT');
        console.log('  ✅ Column secondary_color ensured.');

        await db.run('ALTER TABLE V3_Teams ADD COLUMN IF NOT EXISTS tertiary_color TEXT');
        console.log('  ✅ Column tertiary_color ensured.');
    } catch (error) {
        console.error('  ❌ Error adding color columns:', error.message);
        throw error;
    }
};
