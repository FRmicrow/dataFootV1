import db from './src/config/database.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkTable() {
    try {
        await db.init();
        const res = await db.get("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'v4_club_logos')");
        console.log('Table V4_Club_Logos exists:', res.exists);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTable();
