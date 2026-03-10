
import { performDiscoveryScan } from '../../services/v3/auditService.js';
import db from '../../config/database.js';

async function run() {
    try {
        console.log("🗄️ Initializing database...");
        await db.init();

        console.log("🔍 Starting Discovery Scan...");
        const result = await performDiscoveryScan();
        console.log("✅ Scan Result:", JSON.stringify(result, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("💥 Fatal error during scan:", err);
        process.exit(1);
    }
}

run();
