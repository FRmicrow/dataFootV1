
import db from '../src/config/database.js';
import logger from '../src/utils/logger.js';

async function checkColumns() {
    await db.init();
    try {
        const compCols = await db.all(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'v4' AND table_name = 'competitions'
        `);
        console.log('v4.competitions columns:', compCols.map(c => c.column_name));

        const countryCols = await db.all(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'v4' AND table_name = 'countries'
        `);
        console.log('v4.countries columns:', countryCols.map(c => c.column_name));
    } catch (err) {
        console.error(err);
    }
}

checkColumns();
