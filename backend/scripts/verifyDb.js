import db from '../backend/src/config/database.js';

async function verify() {
    try {
        await db.init();
        console.log('--- DATABASE VERIFICATION ---');

        const tables = ['player_club_stats', 'player_national_stats', 'team_statistics'];

        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const info = db.all(`PRAGMA table_info(${table})`);
            const columnNames = info.map(row => row.name);
            console.log('Columns:', columnNames.join(', '));

            const count = db.get(`SELECT COUNT(*) as count FROM ${table}`);
            console.log('Row count:', count.count);

            if (count.count > 0) {
                const sample = db.get(`SELECT * FROM ${table} LIMIT 1`);
                console.log('Sample Data (Detailed Fields):');
                // Check a few new fields
                const fieldsToCheck = ['yellow_cards', 'red_cards', 'minutes_played', 'clean_sheets', 'avg_goals_for'];
                fieldsToCheck.forEach(f => {
                    if (sample[f] !== undefined) {
                        console.log(`  ${f}: ${sample[f]}`);
                    }
                });
            }
        }

        console.log('\n--- NATIONAL TEAM GROUPING CHECK ---');
        const playersWithNationalStats = db.all('SELECT DISTINCT player_id FROM player_national_stats LIMIT 5');
        for (const p of playersWithNationalStats) {
            const stats = db.all('SELECT * FROM player_national_stats WHERE player_id = ?', [p.player_id]);
            console.log(`Player ${p.player_id} has ${stats.length} national team seasons.`);
        }

    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verify();
