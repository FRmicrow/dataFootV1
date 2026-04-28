
import db from '../../src/config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    try {
        await db.init();
        logger.info('🧹 Starting OPTIMIZED Intelligent People De-duplication...');

        // 1. Create a mapping of Loser ID -> Winner ID
        await db.run(`DROP TABLE IF EXISTS people_dedup_map`);
        await db.run(`
            CREATE TABLE people_dedup_map AS
            WITH ranked_people AS (
                SELECT 
                    person_id,
                    source_tm_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY source_tm_id 
                        ORDER BY 
                            (CASE WHEN birth_date_label IS NOT NULL AND birth_date_label <> '' THEN 0 ELSE 1 END),
                            person_id ASC
                    ) as rank
                FROM v4.people
                WHERE source_tm_id <> ''
            )
            SELECT 
                r_loser.person_id as loser_id,
                r_winner.person_id as winner_id
            FROM ranked_people r_loser
            JOIN ranked_people r_winner ON r_loser.source_tm_id = r_winner.source_tm_id AND r_winner.rank = 1
            WHERE r_loser.rank > 1
        `);

        // IMPORTANT: Add index to the mapping table
        await db.run(`CREATE INDEX idx_dedup_map_loser ON people_dedup_map(loser_id)`);

        const mapCount = await db.get('SELECT COUNT(*) as count FROM people_dedup_map');
        logger.info({ count: mapCount.count }, 'Mapping table created and indexed.');

        if (parseInt(mapCount.count) === 0) {
            logger.info('No duplicates found. Finished.');
            process.exit(0);
        }

        // 2. Redirect References
        logger.info('Redirecting references (this may take time)...');
        
        await db.run(`
            UPDATE v4.matches m
            SET referee_person_id = d.winner_id
            FROM people_dedup_map d
            WHERE m.referee_person_id = d.loser_id
        `);
        logger.info('✅ Matches (Referees) redirected.');

        await db.run(`
            UPDATE v4.match_lineups l
            SET player_id = d.winner_id
            FROM people_dedup_map d
            WHERE l.player_id = d.loser_id
        `);
        logger.info('✅ Match Lineups redirected.');

        await db.run(`
            UPDATE v4.match_events e
            SET player_id = d.winner_id
            FROM people_dedup_map d
            WHERE e.player_id = d.loser_id
        `);
        await db.run(`
            UPDATE v4.match_events e
            SET related_player_id = d.winner_id
            FROM people_dedup_map d
            WHERE e.related_player_id = d.loser_id
        `);
        logger.info('✅ Match Events redirected.');

        await db.run(`
            UPDATE v4.player_season_xg x
            SET person_id = d.winner_id
            FROM people_dedup_map d
            WHERE x.person_id = d.loser_id
        `);
        logger.info('✅ Player Season xG redirected.');

        // 3. Delete Losers
        logger.info('Deleting duplicate rows from v4.people...');
        await db.run(`
            DELETE FROM v4.people
            WHERE person_id IN (SELECT loser_id FROM people_dedup_map)
        `);
        
        logger.info('🎉 DE-DUPLICATION COMPLETE');
        process.exit(0);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}

main();
