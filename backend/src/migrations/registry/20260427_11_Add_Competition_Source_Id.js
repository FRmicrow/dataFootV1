
import logger from '../../utils/logger.js';

export const up = async (db) => {
    logger.info({}, '🚀 Adding source_id to v4.competitions');
    await db.run(`ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS source_id TEXT`);
    logger.info({}, '✅ Added source_id column');
};

export const down = async (db) => {
    await db.run(`ALTER TABLE v4.competitions DROP COLUMN IF EXISTS source_id`);
    logger.info({}, '⏪ Removed source_id column');
};
