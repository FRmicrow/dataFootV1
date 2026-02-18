/**
 * Comprehensive deduplication of competitions for Ronaldo
 * Merge all duplicate competitions to use the correct IDs
 */

import db from '../src/config/database.js';

async function deduplicateCompetitions() {
    console.log('🔍 Initializing database...');
    await db.init();

    console.log('\n📊 Deduplicating competitions...\n');

    // Define correct IDs (usually the lower ID number which was created first)
    const merges = [
        {
            type: 'championship',
            name: 'Premier League',
            correctId: 6,
            duplicateIds: [235]
        },
        {
            type: 'cup',
            name: 'League Cup',
            correctId: 12,
            duplicateIds: [90]
        },
        {
            type: 'international_cup',
            name: 'UEFA Champions League',
            correctId: 2,
            duplicateIds: [4]
        },
        {
            type: 'international_cup',
            name: 'UEFA Super Cup',
            correctId: 3,
            duplicateIds: [5]
        }
    ];

    for (const merge of merges) {
        console.log(`\n🔄 Merging ${merge.name} (${merge.type})...`);

        for (const dupId of merge.duplicateIds) {
            // Find records using duplicate ID
            const records = db.all(
                `SELECT id FROM player_club_stats 
                 WHERE player_id = 198 
                 AND competition_type = ? 
                 AND competition_id = ?`,
                [merge.type, dupId]
            );

            console.log(`  Found ${records.length} records with duplicate ID ${dupId}`);

            // Update to correct ID
            for (const record of records) {
                db.run(
                    'UPDATE player_club_stats SET competition_id = ? WHERE id = ?',
                    [merge.correctId, record.id]
                );
            }

            if (records.length > 0) {
                console.log(`  ✓ Updated ${records.length} records to use ID ${merge.correctId}`);
            }
        }
    }

    console.log('\n✅ Deduplication complete!');

    // Verification
    console.log('\n📊 Final Competition List:');
    const finalStats = db.all(`
        SELECT DISTINCT pcs.competition_type, pcs.competition_id, 
               COALESCE(ch.name, nc.name, ic.name) as comp_name
        FROM player_club_stats pcs
        LEFT JOIN championships ch ON pcs.competition_type = 'championship' AND pcs.competition_id = ch.id
        LEFT JOIN national_cups nc ON pcs.competition_type = 'cup' AND pcs.competition_id = nc.id
        LEFT JOIN international_cups ic ON pcs.competition_type = 'international_cup' AND pcs.competition_id = ic.id
        WHERE pcs.player_id = 198
        ORDER BY pcs.competition_type, comp_name
    `);

    finalStats.forEach(s => {
        console.log(`  ${s.competition_type}: ${s.comp_name || 'NULL'} (ID: ${s.competition_id})`);
    });
}

deduplicateCompetitions()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
