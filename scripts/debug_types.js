import db from '../backend/src/config/database.js';

async function run() {
    await db.init();
    const trophyTypes = db.all('SELECT * FROM V2_trophy_type');
    console.log(JSON.stringify(trophyTypes, null, 2));
    process.exit(0);
}

run();
