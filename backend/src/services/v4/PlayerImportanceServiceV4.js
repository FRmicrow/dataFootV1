import db from '../../config/database.js';
import logger from '../../utils/logger.js';

class PlayerImportanceServiceV4 {
    /**
     * Recalculates importance score and rank for all people
     * Based on apps, goals, assists and league prestige
     */
    async recalculateAll() {
        logger.info('🚀 Starting Player Importance recalculation...');
        const startTime = Date.now();

        try {
            // 1. Calculate raw scores via a temporary CTE
            // League weight: 1000 / rank (capped at 1000)
            // Bonus: goal=5, assist=3
            // Recent season multiplier (linear decay)
            await db.run(`
                WITH player_stats AS (
                    SELECT 
                        ps.person_id,
                        SUM(
                            (ps.apps + (ps.goals * 5) + (ps.assists * 3)) * 
                            (1000.0 / COALESCE(NULLIF(c.importance_rank, 0), 1000)) *
                            (CASE 
                                WHEN ps.season_label >= '2023' THEN 1.0
                                WHEN ps.season_label >= '2022' THEN 0.8
                                WHEN ps.season_label >= '2021' THEN 0.6
                                WHEN ps.season_label >= '2020' THEN 0.4
                                ELSE 0.2 
                             END)
                        ) as total_score
                    FROM v4.player_season_xg ps
                    JOIN v4.competitions c ON ps.competition_id = c.competition_id
                    GROUP BY ps.person_id
                )
                UPDATE v4.people p
                SET importance_score = ps.total_score
                FROM player_stats ps
                WHERE p.person_id = ps.person_id
            `);

            // 2. Update DENSE_RANK
            await db.run(`
                WITH ranked_players AS (
                    SELECT person_id, DENSE_RANK() OVER (ORDER BY importance_score DESC) as new_rank
                    FROM v4.people
                    WHERE importance_score > 0
                )
                UPDATE v4.people p
                SET importance_rank = rp.new_rank
                FROM ranked_players rp
                WHERE p.person_id = rp.person_id
            `);

            // 3. Set a high rank for players with 0 score (bottom of results)
            await db.run(`
                UPDATE v4.people 
                SET importance_rank = 999999 
                WHERE importance_score = 0 OR importance_score IS NULL
            `);

            const duration = (Date.now() - startTime) / 1000;
            logger.info(`✅ Importance recalculation completed in ${duration}s`);
            return { success: true, duration };

        } catch (error) {
            logger.error({ err: error }, '❌ Failed to recalculate player importance');
            throw error;
        }
    }
}

export default new PlayerImportanceServiceV4();
