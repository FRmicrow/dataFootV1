import ColorService from '../../src/services/v3/ColorService.js';
import db from '../../src/config/database.js';

async function run() {
    try {
        await db.init();

        // Parse limit from arguments
        const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
        const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;

        console.log(`🚀 Starting Batch Color Extraction (via ColorService)...`);

        await ColorService.batchProcessMissingColors(limit);

        console.log('🎉 Batch processing finished.');

    } catch (error) {
        console.error('💥 Critical script failure:', error);
    } finally {
        process.exit(0);
    }
}

run();
