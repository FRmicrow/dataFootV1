
import db from '../src/config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
    try {
        await db.init();
        const res = await db.all(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'v4' 
              AND table_name IN ('clubs', 'teams')
        `);
        console.log(res);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
