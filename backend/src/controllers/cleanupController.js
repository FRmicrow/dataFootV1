import db from '../config/database.js';

export const getCleanupCandidates = async (req, res) => {
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    try {
        // Count orphaned competition IDs (competition_id in stats but not in competitions table)
        const countSql = `
            SELECT COUNT(DISTINCT s.competition_id) as count 
            FROM V2_player_statistics s
            LEFT JOIN V2_competitions comp ON s.competition_id = comp.competition_id
            WHERE s.competition_id IS NOT NULL 
            AND comp.competition_id IS NULL
        `;
        const countRes = await db.get(countSql);
        const total = countRes.count;

        // Get list of orphaned competition IDs with their record counts
        const orphanedIdsSql = `
            SELECT 
                s.competition_id,
                COUNT(*) as affected_records,
                MAX(s.matches_played) as max_matches
            FROM V2_player_statistics s
            LEFT JOIN V2_competitions comp ON s.competition_id = comp.competition_id
            WHERE s.competition_id IS NOT NULL 
            AND comp.competition_id IS NULL
            GROUP BY s.competition_id
            ORDER BY affected_records DESC
            LIMIT ? OFFSET ?
        `;

        const orphanedIds = await db.all(orphanedIdsSql, [limit, offset]);

        // For each orphaned ID, get one example player (the one with most matches)
        const rows = [];
        for (const orphaned of orphanedIds) {
            const exampleSql = `
                SELECT 
                    s.competition_id as orphaned_competition_id,
                    s.stat_id,
                    s.player_id,
                    s.season,
                    s.club_id,
                    p.first_name,
                    p.last_name,
                    p.photo_url,
                    c.club_name,
                    c.country_id,
                    co.country_name,
                    s.matches_played,
                    s.goals,
                    s.assists,
                    ? as affected_records
                FROM V2_player_statistics s
                LEFT JOIN V2_players p ON s.player_id = p.player_id
                JOIN V2_clubs c ON s.club_id = c.club_id
                LEFT JOIN V2_countries co ON c.country_id = co.country_id
                WHERE s.competition_id = ?
                ORDER BY s.matches_played DESC
                LIMIT 1
            `;

            const example = await db.get(exampleSql, [orphaned.affected_records, orphaned.competition_id]);
            if (example) {
                rows.push(example);
            }
        }

        // Debug: Log first row to see what data we're getting
        if (rows.length > 0) {
            console.log('Sample orphaned competition:', rows[0]);
        }

        res.json({
            unknowns: rows,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });

    } catch (e) {
        console.error('Error in getCleanupCandidates:', e);
        res.status(500).json({ error: e.message });
    }
};

export const mergeStats = async (req, res) => {
    const { keepId, removeId } = req.body;
    try {
        await db.run("DELETE FROM V2_player_statistics WHERE stat_id = ?", [removeId]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const assignCompetition = async (req, res) => {
    const { statId, competitionId } = req.body;
    try {
        await db.run("UPDATE V2_player_statistics SET competition_id = ? WHERE stat_id = ?", [competitionId, statId]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// NEW: Bulk update all records with orphaned competition_id (with duplicate handling)
export const bulkUpdateOrphanedCompetition = async (req, res) => {
    const { orphanedCompetitionId, newCompetitionId } = req.body;

    try {
        // Step 1: Find records that would create duplicates
        const duplicateCheckSql = `
            SELECT 
                orphaned.stat_id as orphaned_stat_id,
                orphaned.player_id,
                orphaned.club_id,
                orphaned.season,
                orphaned.matches_played as orphaned_matches,
                orphaned.goals as orphaned_goals,
                orphaned.assists as orphaned_assists,
                existing.stat_id as existing_stat_id,
                existing.matches_played as existing_matches,
                existing.goals as existing_goals,
                existing.assists as existing_assists
            FROM V2_player_statistics orphaned
            INNER JOIN V2_player_statistics existing 
                ON orphaned.player_id = existing.player_id
                AND orphaned.club_id = existing.club_id
                AND orphaned.season = existing.season
                AND existing.competition_id = ?
            WHERE orphaned.competition_id = ?
        `;

        const duplicates = await db.all(duplicateCheckSql, [newCompetitionId, orphanedCompetitionId]);

        let mergedCount = 0;
        let updatedCount = 0;

        // Step 2: Merge duplicates (sum the stats)
        for (const dup of duplicates) {
            const newMatches = (dup.existing_matches || 0) + (dup.orphaned_matches || 0);
            const newGoals = (dup.existing_goals || 0) + (dup.orphaned_goals || 0);
            const newAssists = (dup.existing_assists || 0) + (dup.orphaned_assists || 0);

            // Update the existing record with merged stats
            await db.run(
                `UPDATE V2_player_statistics 
                 SET matches_played = ?, goals = ?, assists = ?
                 WHERE stat_id = ?`,
                [newMatches, newGoals, newAssists, dup.existing_stat_id]
            );

            // Delete the orphaned record
            await db.run(
                "DELETE FROM V2_player_statistics WHERE stat_id = ?",
                [dup.orphaned_stat_id]
            );

            mergedCount++;
        }

        // Step 3: Update remaining orphaned records (those that won't create duplicates)
        const updateResult = await db.run(
            `UPDATE V2_player_statistics 
             SET competition_id = ? 
             WHERE competition_id = ?`,
            [newCompetitionId, orphanedCompetitionId]
        );

        updatedCount = updateResult.changes;

        res.json({
            success: true,
            updatedCount,
            mergedCount,
            totalProcessed: updatedCount + mergedCount
        });
    } catch (e) {
        console.error('Error in bulkUpdateOrphanedCompetition:', e);
        res.status(500).json({ error: e.message });
    }
};

export const getCompetitionsForSelect = async (req, res) => {
    const { countryId } = req.query;
    try {
        let sql = "SELECT * FROM V2_competitions";
        let params = [];
        if (countryId) {
            if (countryId.includes(',')) {
                const ids = countryId.split(',').map(n => parseInt(n)).filter(n => !isNaN(n));
                if (ids.length > 0) {
                    sql += ` WHERE country_id IN (${ids.join(',')}) `;
                }
            } else {
                sql += " WHERE country_id = ?";
                params.push(countryId);
            }
        }
        sql += " ORDER BY competition_name";
        const comps = await db.all(sql, params);
        res.json(comps);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Stub functions for routes that are no longer used in the orphaned ID workflow
export const initializeRegions = async (req, res) => {
    res.status(501).json({ error: 'Not implemented in orphaned ID workflow' });
};

export const consolidateGenericCompetitions = async (req, res) => {
    res.status(501).json({ error: 'Not implemented in orphaned ID workflow' });
};

export const getAllCompetitions = async (req, res) => {
    try {
        const comps = await db.all("SELECT * FROM V2_competitions ORDER BY competition_name");
        res.json(comps);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateCompetitionCountry = async (req, res) => {
    res.status(501).json({ error: 'Not implemented in orphaned ID workflow' });
};

export const importMappings = async (req, res) => {
    res.status(501).json({ error: 'Not implemented in orphaned ID workflow' });
};

export const runCompetitionDataUpdate = async (req, res) => {
    res.status(501).json({ error: 'Not implemented in orphaned ID workflow' });
};

export const getVerificationReport = async (req, res) => {
    res.status(501).json({ error: 'Not implemented in orphaned ID workflow' });
};

// NEW: Get unresolved competitions for manual review
export const getUnresolvedCompetitions = async (req, res) => {
    try {
        const unresolved = db.all(`
            SELECT 
                u.*,
                p.first_name,
                p.last_name,
                c.club_name,
                co.country_name
            FROM V2_unresolved_competitions u
            JOIN V2_players p ON u.player_id = p.player_id
            JOIN V2_clubs c ON u.club_id = c.club_id
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            WHERE u.resolved = 0
            ORDER BY u.matches_played DESC, u.created_at DESC
        `);
        
        res.json(unresolved);
    } catch (e) {
        console.error('Error fetching unresolved competitions:', e);
        res.status(500).json({ error: e.message });
    }
};

// NEW: Resolve an unresolved competition by assigning it manually
export const resolveUnresolvedCompetition = async (req, res) => {
    const { unresolvedId, competitionId } = req.body;
    
    try {
        // Get the unresolved record details
        const unresolved = db.get(
            "SELECT * FROM V2_unresolved_competitions WHERE unresolved_id = ?",
            [unresolvedId]
        );
        
        if (!unresolved) {
            return res.status(404).json({ error: 'Unresolved competition not found' });
        }

        // Update or insert the player statistics with the correct competition
        const existingStat = db.get(
            `SELECT stat_id FROM V2_player_statistics 
             WHERE player_id = ? AND club_id = ? AND season = ? AND competition_id IS NULL`,
            [unresolved.player_id, unresolved.club_id, unresolved.season]
        );

        if (existingStat) {
            // Update existing stat with the competition
            db.run(
                "UPDATE V2_player_statistics SET competition_id = ? WHERE stat_id = ?",
                [competitionId, existingStat.stat_id]
            );
        }

        // Mark as resolved
        db.run(
            `UPDATE V2_unresolved_competitions 
             SET resolved = 1, resolved_competition_id = ?, resolved_at = datetime('now')
             WHERE unresolved_id = ?`,
            [competitionId, unresolvedId]
        );

        res.json({ success: true });
    } catch (e) {
        console.error('Error resolving competition:', e);
        res.status(500).json({ error: e.message });
    }
};
