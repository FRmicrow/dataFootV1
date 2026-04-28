
import logger from '../../utils/logger.js';

/**
 * Migration 20260427_06 — Rework People V4
 * 
 * - Adds first_name and last_name columns.
 * - Splits full_name into first_name and last_name.
 * - Converts birth_date_label (DD/MM/YYYY) to birth_date (DATE).
 * - Drops birth_date_label.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Starting rework of v4.people');

    // 1. Add first_name and last_name
    await db.run(`
        ALTER TABLE v4.people 
        ADD COLUMN IF NOT EXISTS first_name TEXT,
        ADD COLUMN IF NOT EXISTS last_name TEXT
    `);
    logger.info({}, '✅ Added first_name and last_name columns to v4.people');

    // 2. Populate first_name and last_name from full_name
    await db.run(`
        UPDATE v4.people
        SET 
            first_name = CASE 
                WHEN POSITION(' ' IN full_name) > 0 THEN SPLIT_PART(full_name, ' ', 1)
                ELSE full_name 
            END,
            last_name = CASE 
                WHEN POSITION(' ' IN full_name) > 0 THEN SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)
                ELSE NULL 
            END
        WHERE first_name IS NULL AND last_name IS NULL
    `);
    logger.info({}, '✅ Populated first_name and last_name by splitting full_name');

    // 3. Merge birth_date_label into birth_date
    // Handle DD/MM/YYYY format
    const dateMigration = await db.run(`
        UPDATE v4.people
        SET birth_date = TO_DATE(birth_date_label, 'DD/MM/YYYY')
        WHERE birth_date IS NULL 
          AND birth_date_label ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
    `);
    logger.info({ changes: dateMigration.changes }, '✅ Merged birth_date_label into birth_date');

    // 4. Drop birth_date_label
    await db.run(`ALTER TABLE v4.people DROP COLUMN IF EXISTS birth_date_label`);
    logger.info({}, '✅ Dropped redundant birth_date_label column');

    logger.info({}, '🏁 Rework of v4.people complete');
};

export const down = async (db) => {
    await db.run(`ALTER TABLE v4.people ADD COLUMN IF NOT EXISTS birth_date_label TEXT`);
    // Note: Re-populating birth_date_label from birth_date is possible but lossy for 'no data' strings.
    await db.run(`UPDATE v4.people SET birth_date_label = TO_CHAR(birth_date, 'DD/MM/YYYY') WHERE birth_date_label IS NULL`);
    
    await db.run(`ALTER TABLE v4.people DROP COLUMN IF EXISTS first_name`);
    await db.run(`ALTER TABLE v4.people DROP COLUMN IF EXISTS last_name`);
    logger.info({}, '⏪ Rework of v4.people reverted');
};
