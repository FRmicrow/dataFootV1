import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

async function deduplicateCompetitions() {
    await db.init();
    logger.info('Starting systemic deduplication of v4.competitions...');

    const duplicates = await db.query(`
        SELECT name, ARRAY_AGG(competition_id) as ids
        FROM v4.competitions
        GROUP BY name
        HAVING COUNT(*) > 1
    `);

    logger.info(`Found ${duplicates.length} duplicate competition names.`);

    for (const dup of duplicates) {
        const canonicalId = dup.ids[0];
        const redundantIds = dup.ids.slice(1);

        logger.info(`Merging ${dup.name} (${redundantIds.length} redundant IDs) into ${canonicalId}`);

        for (const oldId of redundantIds) {
            let tx;
            try {
                tx = await db.getTransactionClient();
                await tx.beginTransaction();

                await tx.run('UPDATE v4.matches SET competition_id = ? WHERE competition_id = ?', [canonicalId, oldId]);
                await tx.run('UPDATE v4.competition_relations SET source_id = ? WHERE source_id = ?', [canonicalId, oldId]);
                await tx.run('UPDATE v4.competition_relations SET target_id = ? WHERE target_id = ?', [canonicalId, oldId]);
                
                // Resolve season_editions conflicts: delete from old if already in canonical
                await tx.run(`
                    DELETE FROM v4.season_editions s_old
                    WHERE competition_id = ? 
                    AND EXISTS (
                        SELECT 1 FROM v4.season_editions s_new 
                        WHERE s_new.competition_id = ? AND s_new.season_label = s_old.season_label
                    )
                `, [oldId, canonicalId]);
                await tx.run('UPDATE v4.season_editions SET competition_id = ? WHERE competition_id = ?', [canonicalId, oldId]);
                
                await tx.run('UPDATE v4.player_season_xg SET competition_id = ? WHERE competition_id = ?', [canonicalId, oldId]);
                
                // Remove self-relations created by merge
                await tx.run('DELETE FROM v4.competition_relations WHERE source_id = target_id');
                
                await tx.run('DELETE FROM v4.competitions WHERE competition_id = ?', [oldId]);

                await tx.commit();
            } catch (err) {
                if (tx) await tx.rollback();
                logger.error({ name: dup.name, oldId, err }, 'Failed to merge competition');
            } finally {
                if (tx) tx.release();
            }
        }
    }

    logger.info('Deduplication complete.');
    process.exit(0);
}

deduplicateCompetitions().catch(err => {
    console.error(err);
    process.exit(1);
});
