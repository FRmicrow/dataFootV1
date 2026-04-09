import 'dotenv/config';

import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const MERGE_RULES = [
    {
        country: 'Espagne',
        canonicalSourceKey: 'espagne-segundadivision',
        duplicateSourceKey: 'espagne-laliga2',
        reason: 'LaLiga2 duplicate import for 2025-2026'
    }
];

async function getCompetitionBySourceKey(countryName, sourceKey) {
    return db.get(
        `
            SELECT
                co.competition_id::text AS competition_id,
                co.country_id::text AS country_id,
                c.name AS country_name,
                co.name,
                co.competition_type,
                co.source_key,
                co.current_logo_url,
                COUNT(m.match_id) AS match_count,
                COUNT(cl.competition_logo_id) AS logo_count
            FROM v4.competitions co
            JOIN v4.countries c ON c.country_id = co.country_id
            LEFT JOIN v4.matches m ON m.competition_id = co.competition_id
            LEFT JOIN v4.competition_logos cl ON cl.competition_id = co.competition_id
            WHERE c.name = ?
              AND co.source_key = ?
            GROUP BY co.competition_id, co.country_id, c.name, co.name, co.competition_type, co.source_key, co.current_logo_url
        `,
        [countryName, sourceKey]
    );
}

async function getUnresolvedNameDuplicates() {
    return db.all(`
        SELECT
            c.name AS country_name,
            co.name AS competition_name,
            COUNT(*) AS duplicate_count
        FROM v4.competitions co
        JOIN v4.countries c ON c.country_id = co.country_id
        GROUP BY c.name, co.name
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC, c.name ASC, co.name ASC
    `);
}

async function mergeCompetition(rule) {
    const canonical = await getCompetitionBySourceKey(rule.country, rule.canonicalSourceKey);
    const duplicate = await getCompetitionBySourceKey(rule.country, rule.duplicateSourceKey);

    if (!canonical) {
        throw new Error(`Canonical competition not found for ${rule.country}:${rule.canonicalSourceKey}`);
    }

    if (!duplicate) {
        logger.info(
            {
                country: rule.country,
                canonicalSourceKey: rule.canonicalSourceKey,
                duplicateSourceKey: rule.duplicateSourceKey
            },
            'Competition merge skipped because duplicate is already absent'
        );
        return;
    }

    if (canonical.competition_id === duplicate.competition_id) {
        return;
    }

    const tx = await db.getTransactionClient();

    try {
        await tx.beginTransaction();

        await tx.run(
            `
                UPDATE v4.matches
                SET competition_id = ?
                WHERE competition_id = ?
            `,
            [canonical.competition_id, duplicate.competition_id]
        );

        await tx.run(
            `
                DELETE FROM v4.competition_logos
                WHERE competition_id = ?
                  AND EXISTS (
                      SELECT 1
                      FROM v4.competition_logos existing
                      WHERE existing.competition_id = ?
                        AND COALESCE(existing.logo_url, '') = COALESCE(v4.competition_logos.logo_url, '')
                        AND COALESCE(existing.start_season, '') = COALESCE(v4.competition_logos.start_season, '')
                        AND COALESCE(existing.end_season, '') = COALESCE(v4.competition_logos.end_season, '')
                        AND COALESCE(existing.start_year, -1) = COALESCE(v4.competition_logos.start_year, -1)
                        AND COALESCE(existing.end_year, -1) = COALESCE(v4.competition_logos.end_year, -1)
                  )
            `,
            [duplicate.competition_id, canonical.competition_id]
        );

        await tx.run(
            `
                UPDATE v4.competition_logos
                SET competition_id = ?
                WHERE competition_id = ?
            `,
            [canonical.competition_id, duplicate.competition_id]
        );

        await tx.run(
            `
                UPDATE v4.competitions
                SET current_logo_url = COALESCE(v4.competitions.current_logo_url, ?)
                WHERE competition_id = ?
            `,
            [duplicate.current_logo_url, canonical.competition_id]
        );

        await tx.run(
            `
                DELETE FROM v4.competitions
                WHERE competition_id = ?
            `,
            [duplicate.competition_id]
        );

        await tx.commit();

        logger.info(
            {
                country: rule.country,
                reason: rule.reason,
                canonicalSourceKey: canonical.source_key,
                duplicateSourceKey: duplicate.source_key,
                canonicalCompetitionId: canonical.competition_id,
                duplicateCompetitionId: duplicate.competition_id,
                canonicalMatchCount: Number(canonical.match_count || 0),
                duplicateMatchCount: Number(duplicate.match_count || 0)
            },
            'Competition duplicate merged'
        );
    } catch (error) {
        await tx.rollback();
        throw error;
    } finally {
        tx.release();
    }
}

async function main() {
    await db.init();
    logger.info('Starting V4 competition canonicalization');

    for (const rule of MERGE_RULES) {
        await mergeCompetition(rule);
    }

    const duplicates = await getUnresolvedNameDuplicates();

    if (duplicates.length > 0) {
        logger.warn({ duplicates }, 'Unresolved competition name duplicates remain after canonicalization');
    } else {
        logger.info('No unresolved competition name duplicates remain after canonicalization');
    }
}

main()
    .catch((error) => {
        logger.error({ err: error }, 'V4 competition canonicalization failed');
        process.exitCode = 1;
    });
