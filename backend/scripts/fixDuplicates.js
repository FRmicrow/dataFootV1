/**
 * Fix duplicate clubs and competitions for Ronaldo's data
 * Merge "Manchester Utd" (957) into "Manchester United" (10)
 * Use existing "UEFA Champions League" (2)
 */

import db from '../src/config/database.js';

async function fixDuplicates() {
    console.log('🔍 Initializing database...');
    await db.init();

    console.log('\n📊 Fixing duplicates...\n');

    const CORRECT_MAN_UTD_ID = 10;  // Manchester United
    const DUPLICATE_MAN_UTD_ID = 957; // Manchester Utd
    const CORRECT_UCL_ID = 2;  // UEFA Champions League
    const DUPLICATE_UCL_ID = 1; // CONCACAF Champions League (wrong one used)

    // Update all player_club_stats to use correct Manchester United ID
    const manUtdStats = db.all(
        'SELECT id FROM player_club_stats WHERE club_id = ? AND player_id = 198',
        [DUPLICATE_MAN_UTD_ID]
    );

    console.log(`Found ${manUtdStats.length} records with duplicate Manchester Utd`);

    for (const stat of manUtdStats) {
        db.run(
            'UPDATE player_club_stats SET club_id = ? WHERE id = ?',
            [CORRECT_MAN_UTD_ID, stat.id]
        );
    }
    console.log(`✓ Updated ${manUtdStats.length} records to use Manchester United (ID: ${CORRECT_MAN_UTD_ID})`);

    // Update all international_cup records to use correct UEFA Champions League
    const uclStats = db.all(
        `SELECT id, competition_id FROM player_club_stats 
         WHERE player_id = 198 
         AND competition_type = 'international_cup' 
         AND competition_id = ?`,
        [DUPLICATE_UCL_ID]
    );

    console.log(`\nFound ${uclStats.length} records with wrong Champions League ID`);

    for (const stat of uclStats) {
        db.run(
            'UPDATE player_club_stats SET competition_id = ? WHERE id = ?',
            [CORRECT_UCL_ID, stat.id]
        );
    }
    console.log(`✓ Updated ${uclStats.length} records to use UEFA Champions League (ID: ${CORRECT_UCL_ID})`);

    // Delete duplicate club if no other players use it
    const otherPlayers = db.get(
        'SELECT COUNT(*) as count FROM player_club_stats WHERE club_id = ? AND player_id != 198',
        [DUPLICATE_MAN_UTD_ID]
    );

    if (otherPlayers.count === 0) {
        db.run('DELETE FROM clubs WHERE id = ?', [DUPLICATE_MAN_UTD_ID]);
        console.log(`\n✓ Deleted duplicate club "Manchester Utd" (ID: ${DUPLICATE_MAN_UTD_ID})`);
    } else {
        console.log(`\n⚠️ Keeping duplicate club as ${otherPlayers.count} other players use it`);
    }

    console.log('\n✅ Duplicates fixed!');

    // Verify the fix
    console.log('\n📊 Verification:');
    const verifyStats = db.all(`
        SELECT c.name as club, COUNT(*) as count
        FROM player_club_stats pcs
        JOIN clubs c ON pcs.club_id = c.id
        WHERE pcs.player_id = 198
        GROUP BY c.name
        ORDER BY count DESC
    `);

    verifyStats.forEach(s => {
        console.log(`  ${s.club}: ${s.count} records`);
    });
}

fixDuplicates()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
