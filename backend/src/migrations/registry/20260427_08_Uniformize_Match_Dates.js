
import logger from '../../utils/logger.js';

/**
 * Migration 20260427_08 — Uniformize Match Dates
 * 
 * - Recovers ~175k missing match_date values from date_label.
 * - Handles numeric (DD/MM/YYYY) and French text formats.
 * - Drops the redundant date_label column.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Starting uniformization of v4.matches dates');

    // 1. Sync Numeric Format (DD/MM/YYYY)
    const numericSync = await db.run(`
        UPDATE v4.matches
        SET match_date = TO_DATE(SUBSTRING(date_label FROM '[0-9]{1,2}/[0-9]{2}/[0-9]{4}'), 'DD/MM/YYYY')
        WHERE match_date IS NULL 
          AND date_label ~ '[0-9]{1,2}/[0-9]{2}/[0-9]{4}'
    `);
    logger.info({ changes: numericSync.changes }, '✅ Synchronized numeric dates (DD/MM/YYYY)');

    // 2. Sync French Text Format (e.g. "7 janv. 1951")
    // We use a multi-stage replacement to convert French months to numbers
    const textSync = await db.run(`
        UPDATE v4.matches
        SET match_date = TO_DATE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    SUBSTRING(date_label FROM ' [0-9]{1,2} .* [0-9]{4}'),
                    '(janv\\.|févr\\.|mars|avr\\.|mai|juin|juil\\.|août|sept\\.|oct\\.|nov\\.|déc\\.)',
                    CASE 
                        WHEN date_label LIKE '%janv.%' THEN '01'
                        WHEN date_label LIKE '%févr.%' THEN '02'
                        WHEN date_label LIKE '%mars%' THEN '03'
                        WHEN date_label LIKE '%avr.%' THEN '04'
                        WHEN date_label LIKE '%mai%' THEN '05'
                        WHEN date_label LIKE '%juin%' THEN '06'
                        WHEN date_label LIKE '%juil.%' THEN '07'
                        WHEN date_label LIKE '%août%' THEN '08'
                        WHEN date_label LIKE '%sept.%' THEN '09'
                        WHEN date_label LIKE '%oct.%' THEN '10'
                        WHEN date_label LIKE '%nov.%' THEN '11'
                        WHEN date_label LIKE '%déc.%' THEN '12'
                        ELSE '00'
                    END
                ),
                '^ ', ''
            ),
            'DD MM YYYY'
        )
        WHERE match_date IS NULL 
          AND date_label IS NOT NULL
          AND date_label ~ ' [0-9]{1,2} (janv\\.|févr\\.|mars|avr\\.|mai|juin|juil\\.|août|sept\\.|oct\\.|nov\\.|déc\\.) [0-9]{4}'
    `);
    logger.info({ changes: textSync.changes }, '✅ Synchronized French text dates');

    // 3. Drop date_label
    await db.run(`ALTER TABLE v4.matches DROP COLUMN IF EXISTS date_label`);
    logger.info({}, '✅ Dropped redundant date_label column');

    logger.info({}, '🏁 Uniformization of v4.matches dates complete');
};

export const down = async (db) => {
    await db.run(`ALTER TABLE v4.matches ADD COLUMN IF NOT EXISTS date_label TEXT`);
    // Note: Re-populating date_label from match_date is lossy (original format/day of week is gone).
    await db.run(`UPDATE v4.matches SET date_label = TO_CHAR(match_date, 'DD/MM/YYYY') WHERE date_label IS NULL`);
    logger.info({}, '⏪ Uniformization of v4.matches dates reverted');
};
