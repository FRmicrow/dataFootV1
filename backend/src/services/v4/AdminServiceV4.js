import db from '../../config/database.js';
import logger from '../../utils/logger.js';

const DEFAULT_PHOTO = 'https://tmssl.akamaized.net//images/foto/normal/default.jpg?lm=1';
const NORM_EXPR = `LOWER(REGEXP_REPLACE(unaccent(full_name), '[^a-zA-Z0-9]', '', 'g'))`;

class AdminServiceV4 {
    /**
     * Systemic Deduplication of v4.people
     * Merges duplicate players detected via unaccent + regex normalization.
     * Covers all FK tables: match_lineups, match_events (x2), player_season_xg, matches.
     */
    async deduplicatePeople() {
        logger.info('Starting systemic deduplication of v4.people (unaccent normalization)...');

        try {
            // 0. Ensure performance indexes exist (idempotent)
            await db.run('CREATE INDEX IF NOT EXISTS idx_match_lineups_player_v4 ON v4.match_lineups(player_id)');
            await db.run('CREATE INDEX IF NOT EXISTS idx_player_season_xg_person_v4 ON v4.player_season_xg(person_id)');
            await db.run('CREATE INDEX IF NOT EXISTS idx_match_events_player_v4 ON v4.match_events(player_id)');

            // 1. Detect duplicate groups via normalized name
            const duplicateGroups = await db.query(`
                WITH normalized_people AS (
                    SELECT
                        person_id,
                        full_name,
                        photo_url,
                        ${NORM_EXPR} AS norm_name
                    FROM v4.people
                )
                SELECT
                    norm_name,
                    ARRAY_AGG(person_id ORDER BY
                        (photo_url IS NOT NULL AND photo_url != $1 AND photo_url NOT LIKE '%default%') DESC,
                        person_id ASC
                    ) AS ids
                FROM normalized_people
                WHERE norm_name IS NOT NULL AND norm_name != ''
                GROUP BY norm_name
                HAVING COUNT(*) > 1
                LIMIT 10000
            `, [DEFAULT_PHOTO]);

            if (duplicateGroups.length === 0) {
                logger.info('No duplicates found. Database is clean.');
                return { success: true, mergedCount: 0, keyUsed: 'unaccent_norm', limitReached: false };
            }

            logger.info(`Found ${duplicateGroups.length} duplicate groups to merge.`);

            // 2. Verify player_season_xg person column name
            const xgSchema = await db.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'v4' AND table_name = 'player_season_xg'
            `);
            const xgPersonCol = xgSchema.some(c => c.column_name === 'person_id') ? 'person_id' : 'player_id';

            let totalDeleted = 0;
            let errors = 0;

            for (const group of duplicateGroups) {
                const canonicalId = group.ids[0];
                const redundantIds = group.ids.slice(1);

                try {
                    for (const oldId of redundantIds) {
                        await db.run('UPDATE v4.match_lineups SET player_id = $1 WHERE player_id = $2', [canonicalId, oldId]);
                        await db.run('UPDATE v4.match_events SET player_id = $1 WHERE player_id = $2', [canonicalId, oldId]);
                        await db.run('UPDATE v4.match_events SET related_player_id = $1 WHERE related_player_id = $2', [canonicalId, oldId]);
                        await db.run('UPDATE v4.matches SET referee_person_id = $1 WHERE referee_person_id = $2', [canonicalId, oldId]);

                        // Resolve player_season_xg conflicts before update
                        const conflicts = await db.query(`
                            SELECT s2.id AS old_stat_id
                            FROM v4.player_season_xg s1
                            JOIN v4.player_season_xg s2
                                ON s1.competition_id = s2.competition_id
                                AND s1.season_label = s2.season_label
                                AND s1.club_id = s2.club_id
                                AND s1.player_name = s2.player_name
                            WHERE s1.${xgPersonCol} = $1 AND s2.${xgPersonCol} = $2
                        `, [canonicalId, oldId]);

                        for (const c of conflicts) {
                            await db.run('DELETE FROM v4.player_season_xg WHERE id = $1', [c.old_stat_id]);
                        }

                        await db.run(`UPDATE v4.player_season_xg SET ${xgPersonCol} = $1 WHERE ${xgPersonCol} = $2`, [canonicalId, oldId]);
                        await db.run('DELETE FROM v4.people WHERE person_id = $1', [oldId]);
                        totalDeleted++;
                    }
                } catch (err) {
                    errors++;
                    logger.error({ err, canonicalId }, 'Failed to merge duplicate group');
                }
            }

            logger.info(`Deduplication complete. Merged ${totalDeleted} records. Errors: ${errors}.`);

            return {
                success: true,
                mergedCount: totalDeleted,
                keyUsed: 'unaccent_norm',
                limitReached: duplicateGroups.length >= 10000,
                errors,
            };
        } catch (error) {
            logger.error({ error }, 'Deduplication failed');
            throw error;
        }
    }

    async getMaintenanceStatus() {
        try {
            const peopleCount = await db.get('SELECT COUNT(*) as count FROM v4.people');
            const lineupCount = await db.get('SELECT COUNT(*) as count FROM v4.match_lineups');

            // Detect typographic duplicates via unaccent normalization
            const duplicateCount = await db.query(`
                SELECT
                    MIN(full_name) AS representative_name,
                    ARRAY_AGG(full_name) AS variants,
                    COUNT(*) AS count
                FROM v4.people
                GROUP BY ${NORM_EXPR}
                HAVING COUNT(*) > 1
                LIMIT 10
            `);

            return {
                timestamp: new Date().toISOString(),
                counts: {
                    people: parseInt(peopleCount.count),
                    lineups: parseInt(lineupCount.count),
                    duplicateGroups: duplicateCount.length
                },
                sampleDuplicates: duplicateCount,
            };
        } catch (error) {
            logger.error({ error }, 'Failed to get maintenance status');
            throw error;
        }
    }
}

export default new AdminServiceV4();
