
import logger from '../../utils/logger.js';

export const up = async (db) => {
    logger.info({}, '🚀 Cleaning up redundant columns in v4.competitions');
    await db.run(`ALTER TABLE v4.competitions DROP COLUMN IF EXISTS source_code`);
    await db.run(`ALTER TABLE v4.competitions DROP COLUMN IF EXISTS source_id`);
    logger.info({}, '✅ Removed source_code and source_id');
};

export const down = async (db) => {
    await db.run(`ALTER TABLE v4.competitions ADD COLUMN source_code TEXT`);
    await db.run(`ALTER TABLE v4.competitions ADD COLUMN source_id TEXT`);
    logger.info({}, '⏪ Restored source_code and source_id');
};
