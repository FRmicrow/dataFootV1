import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { calculateSimilarity } from '../../utils/fuzzy.js';

export class ResolutionService {
    /**
     * Calculates the confidence score between two player records.
     * @param {Object} player1 - Record from V3_Players
     * @param {Object} player2 - Record from V3_Players
     * @returns {number} - Confidence score between 0 and 100
     */
    static async calculateConfidence(player1, player2) {
        // AC 1: API_ID match (100% confidence)
        if (player1.api_id !== null && player1.api_id === player2.api_id) {
            return 100;
        }

        let score = 0;

        // AC 2: Full name similarity
        const nameSimilarity = calculateSimilarity(player1.name, player2.name);
        if (nameSimilarity > 0.95) {
            score += 50;
        } else if (nameSimilarity > 0.85) {
            score += 30;
        }

        // AC 3: Date of birth exact match
        if (player1.birth_date && player1.birth_date === player2.birth_date) {
            score += 30;
        }

        // AC 4: Team history overlap
        const historyOverlap = await this.checkTeamHistoryOverlap(player1.player_id, player2.player_id);
        if (historyOverlap) {
            score += 20;
        }

        // Cap at 99 if no API_ID match but other factors align
        return Math.min(score, 99);
    }

    /**
     * Checks if two players have stats for the same club in the same year.
     */
    static async checkTeamHistoryOverlap(id1, id2) {
        const overlap = await db.get(`
            SELECT 1 
            FROM V3_Player_Stats s1
            JOIN V3_Player_Stats s2 ON s1.team_id = s2.team_id AND s1.season_year = s2.season_year
            WHERE s1.player_id = ? AND s2.player_id = ?
            LIMIT 1
        `, cleanParams([id1, id2]));
        return !!overlap;
    }

    /**
     * Identifies the Master Profile based on data volume.
     */
    static async identifyMaster(id1, id2) {
        const stats1 = (await db.get("SELECT COUNT(*) as c FROM V3_Player_Stats WHERE player_id = ?", cleanParams([id1]))).c;
        const stats2 = (await db.get("SELECT COUNT(*) as c FROM V3_Player_Stats WHERE player_id = ?", cleanParams([id2]))).c;

        return stats1 >= stats2 ? { masterId: id1, ghostId: id2 } : { masterId: id2, ghostId: id1 };
    }

    /**
     * Performs a Safe Merge of two duplicates.
     */
    static async performMerge(id1, id2) {
        const { masterId, ghostId } = await this.identifyMaster(id1, id2);

        console.log(`🔄 Merging Ghost Player ${ghostId} into Master ${masterId}...`);

        await db.run("BEGIN TRANSACTION");
        try {
            // Remap Player Stats
            // Handle unique constraint (player_id, team_id, league_id, season_year)
            // If master already has stats for the same context, we should probably aggregate or keep master's.
            // AC says "remap", let's be careful about unique conflicts.

            const ghostStats = await db.all("SELECT * FROM V3_Player_Stats WHERE player_id = ?", cleanParams([ghostId]));
            for (const stat of ghostStats) {
                const conflict = await db.get(`
                    SELECT stat_id FROM V3_Player_Stats 
                    WHERE player_id = ? AND team_id = ? AND league_id = ? AND season_year = ?
                `, cleanParams([masterId, stat.team_id, stat.league_id, stat.season_year]));

                if (conflict) {
                    // Conflict: Master already has stats here. 
                    // To keep it simple and safe for now: delete ghost stat (no remap)
                    // Or we could sum them up. Given it's stats, summing is logical.
                    await db.run(`
                        UPDATE V3_Player_Stats SET 
                        games_appearences = games_appearences + ?,
                        goals_total = goals_total + ?,
                        goals_assists = goals_assists + ?
                        WHERE stat_id = ?
                    `, cleanParams([stat.games_appearences, stat.goals_total, stat.goals_assists, conflict.stat_id]));
                    await db.run("DELETE FROM V3_Player_Stats WHERE stat_id = ?", cleanParams([stat.stat_id]));
                } else {
                    // No conflict: remap
                    await db.run("UPDATE V3_Player_Stats SET player_id = ? WHERE stat_id = ?", cleanParams([masterId, stat.stat_id]));
                }
            }

            // Remap Trophies
            await db.run(`
                UPDATE V3_Trophies SET player_id = ? 
                WHERE player_id = ?
                AND NOT EXISTS (
                    SELECT 1 FROM V3_Trophies t2 
                    WHERE t2.player_id = ? 
                    AND t2.trophy_id = V3_Trophies.trophy_id
                )
            `, cleanParams([masterId, ghostId, masterId]));
            await db.run("DELETE FROM V3_Trophies WHERE player_id = ?", cleanParams([ghostId])); // Clean up ignored conflicts

            // Delete Ghost Record
            await db.run("DELETE FROM V3_Players WHERE player_id = ?", cleanParams([ghostId]));

            await db.run("COMMIT");
            console.log(`✅ Merge complete. Ghost record ${ghostId} removed.`);
            return { success: true, masterId, ghostId };
        } catch (err) {
            await db.run("ROLLBACK");
            console.error("❌ Merge failed:", err.message);
            throw err;
        }
    }

    /**
     * Scans for potential duplicates in the database.
     */
    static async findGlobalDuplicates(threshold = 80) {
        console.log("🔍 Scanning for duplicate candidates via targeted SQL...");

        // Strategy: Narrow down candidates by finding exact name matches first.
        // Doing fuzzy matching on 300k+ players is impossible O(N^2).
        const pairs = await db.all(`
            SELECT p1.player_id as id1, p2.player_id as id2
            FROM V3_Players p1
            JOIN V3_Players p2 ON p1.name = p2.name AND p1.player_id < p2.player_id
            LIMIT 5000
        `);

        console.log(`📊 Found ${pairs.length} potential name matches to analyze...`);

        const duplicates = [];
        for (const pair of pairs) {
            const p1 = await db.get("SELECT * FROM V3_Players WHERE player_id = ?", cleanParams([pair.id1]));
            const p2 = await db.get("SELECT * FROM V3_Players WHERE player_id = ?", cleanParams([pair.id2]));

            if (!p1 || !p2) continue;

            const confidence = await this.calculateConfidence(p1, p2);
            if (confidence >= threshold) {
                duplicates.push({
                    player1: p1,
                    player2: p2,
                    confidence
                });
            }
        }
        return duplicates;
    }
}
