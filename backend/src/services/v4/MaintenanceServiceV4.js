
import db from '../../config/database.js';
import logger from '../../utils/logger.js';

class MaintenanceServiceV4 {
    /**
     * Systemic Deduplication of v4.matches
     * Merges duplicate matches detected via Business Key (Teams + Comp + Date + Score).
     * Strictly follows the principle of "Merge & Redirect".
     */
    async deduplicateMatches(dryRun = true) {
        logger.info({ dryRun }, '🚀 Starting systemic deduplication of v4.matches...');

        try {
            // Optimized query using CTE to avoid correlated subqueries in ORDER BY
            const duplicateGroups = await db.all(`
                WITH match_counts AS (
                    SELECT 
                        m.match_id,
                        m.home_team_id, m.away_team_id, m.competition_id, m.match_date, m.home_score, m.away_score,
                        (SELECT COUNT(*) FROM v4.match_events e WHERE e.match_id = m.match_id) as event_count,
                        (SELECT COUNT(*) FROM v4.match_lineups l WHERE l.match_id = m.match_id) as lineup_count
                    FROM v4.matches m
                    WHERE EXISTS (
                        SELECT 1 FROM v4.matches m2
                        WHERE m2.home_team_id = m.home_team_id 
                          AND m2.away_team_id = m.away_team_id
                          AND m2.competition_id = m.competition_id
                          AND m2.match_date IS NOT DISTINCT FROM m.match_date
                          AND m2.home_score = m.home_score
                          AND m2.away_score = m.away_score
                          AND m2.match_id != m.match_id
                    )
                )
                SELECT 
                    home_team_id, away_team_id, competition_id, match_date, home_score, away_score,
                    ARRAY_AGG(match_id ORDER BY event_count DESC, lineup_count DESC, match_id ASC) AS ids
                FROM match_counts
                GROUP BY home_team_id, away_team_id, competition_id, match_date, home_score, away_score
            `);

            if (duplicateGroups.length === 0) {
                logger.info('✅ No duplicate matches found based on strict criteria.');
                return { success: true, mergedCount: 0, groupsProcessed: 0 };
            }

            logger.info(`🔍 Found ${duplicateGroups.length} duplicate groups to process.`);

            if (dryRun) {
                const totalRedundant = duplicateGroups.reduce((sum, g) => sum + (g.ids.length - 1), 0);
                logger.info({ totalRedundant }, '📋 DRY RUN: No changes will be applied.');
                return { success: true, mergedCount: 0, groupsProcessed: duplicateGroups.length, totalRedundant };
            }

            let totalMerged = 0;
            let errors = 0;

            for (const group of duplicateGroups) {
                const canonicalId = group.ids[0];
                const redundantIds = group.ids.slice(1);

                for (const oldId of redundantIds) {
                    let client;
                    try {
                        client = await db.db.connect();
                        await client.query('BEGIN');

                        await client.query('UPDATE v4.match_events SET match_id = $1 WHERE match_id = $2', [canonicalId, oldId]);
                        await client.query('UPDATE v4.match_lineups SET match_id = $1 WHERE match_id = $2', [canonicalId, oldId]);
                        await client.query('UPDATE v4.match_stats SET match_id = $1 WHERE match_id = $2', [canonicalId, oldId]);
                        await client.query('UPDATE v4.match_odds SET match_id = $1 WHERE match_id = $2', [canonicalId, oldId]);
                        await client.query('UPDATE v4.external_match_mapping SET v4_match_id = $1 WHERE v4_match_id = $2', [canonicalId, oldId]);
                        await client.query('UPDATE v4.fixture_match_mapping SET v4_match_id = $1 WHERE v4_match_id = $2', [canonicalId, oldId]);
                        await client.query('UPDATE v4.ml_feature_store SET match_id = $1 WHERE match_id = $2', [canonicalId, oldId]);
                        await client.query('UPDATE v4.ml_predictions SET match_id = $1 WHERE match_id = $2', [canonicalId, oldId]);

                        await client.query('DELETE FROM v4.matches WHERE match_id = $1', [oldId]);

                        await client.query('COMMIT');
                        totalMerged++;
                    } catch (err) {
                        if (client) await client.query('ROLLBACK');
                        errors++;
                        logger.error({ err, canonicalId, oldId }, '❌ Failed to merge duplicate match');
                    } finally {
                        if (client) client.release();
                    }
                }
            }

            logger.info(`✨ Deduplication complete. Merged ${totalMerged} matches. Errors: ${errors}.`);
            return { success: true, mergedCount: totalMerged, groupsProcessed: duplicateGroups.length, errors };

        } catch (error) {
            logger.error({ error }, '❌ Deduplication failed');
            throw error;
        }
    }
}

export default new MaintenanceServiceV4();
