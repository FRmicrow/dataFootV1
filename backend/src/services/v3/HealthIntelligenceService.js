import db from '../../config/database.js';

/**
 * HealthIntelligenceService (US_113)
 * Quantifies database integrity and coverage into a 0-100 score.
 */
export class HealthIntelligenceService {
    static calculateScore() {
        // 1. Base Score
        let score = 100;

        // 2. Orphans Deduction (-1 per 1000 orphan players)
        const orphanCount = db.get(`
            SELECT COUNT(*) as count 
            FROM V3_Players p
            WHERE NOT EXISTS (SELECT 1 FROM V3_Player_Stats s WHERE s.player_id = p.player_id)
        `).count;

        const orphanDeduction = Math.floor(orphanCount / 1000);
        score -= orphanDeduction;

        // 3. Data Gaps Deduction (-5 per league season with missing fixtures)
        // Only count seasons that are actually "Imported" (have players) but missing core fixtures
        const missingFixturesLeagues = db.get(`
            SELECT COUNT(*) as count 
            FROM V3_League_Seasons
            WHERE imported_players = 1 AND (imported_fixtures = 0 OR imported_fixtures IS NULL)
        `).count;

        score -= (missingFixturesLeagues * 5);

        // 4. Elite Coverage Bonus (+10 if all Top 10 high-prestige countries have 100% sync)
        const eliteGaps = db.get(`
            SELECT COUNT(*) as count FROM (
                SELECT c.country_id
                FROM V3_Countries c
                JOIN V3_Leagues l ON c.country_id = l.country_id
                JOIN V3_League_Seasons ls ON l.league_id = ls.league_id
                WHERE c.importance_rank <= 10
                GROUP BY c.country_id
                HAVING MIN(ls.imported_players) = 0
            )
        `).count;

        if (eliteGaps === 0) {
            score += 10;
        }

        // 5. Cap score
        score = Math.min(100, Math.max(0, score));

        // 6. Global Coverage Metrics
        const totals = db.get(`
            SELECT 
                COUNT(*) as total_seasons,
                SUM(CASE WHEN imported_players = 1 AND imported_events = 1 AND imported_lineups = 1 THEN 1 ELSE 0 END) as fully_synced
            FROM V3_League_Seasons
        `);

        const coverage_percent = totals.total_seasons > 0
            ? Math.round((totals.fully_synced / totals.total_seasons) * 100)
            : 0;

        return {
            score,
            coverage_percent,
            details: {
                orphans: orphanCount,
                orphan_deduction: orphanDeduction,
                missing_fixture_seasons: missingFixturesLeagues,
                elite_coverage_bonus: eliteGaps === 0 ? 10 : 0
            }
        };
    }
}
