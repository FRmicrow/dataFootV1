import db from '../../config/database_v3.js';

/**
 * GET /api/v3/admin/health
 * Scan DB for inconsistencies
 */
export const getDbHealth = async (req, res) => {
    try {
        const report = {
            checkDate: new Date().toISOString(),
            issues: []
        };
        // Kept for backward compatibility or global summary
        const duplicatesSql = `
            SELECT 
                p.name as player_name, 
                s.season_year, 
                l.name as league_name, 
                COUNT(*) as count
            FROM V3_Player_Stats s
            JOIN V3_Players p ON s.player_id = p.player_id
            JOIN V3_Leagues l ON s.league_id = l.league_id
            GROUP BY s.player_id, s.season_year, l.name
            HAVING count > 1
            LIMIT 50
        `;

        const duplicates = await new Promise((resolve, reject) => {
            db.all(duplicatesSql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (duplicates.length > 0) {
            report.issues.push({
                id: 'DUPLICATE_STATS',
                type: 'Data Integrity',
                severity: 'HIGH',
                count: duplicates.length,
                description: 'Players with duplicate entries for the same league name (e.g. ID fragmentation).',
                sample: duplicates.slice(0, 5)
            });
        }

        res.json(report);
    } catch (e) {
        console.error("Health check failed", e);
        res.status(500).json({ error: e.message });
    }
};

/**
 * POST /api/v3/admin/health/fix
 * Apply auto-fixes
 */
export const fixDbHealth = async (req, res) => {
    const { issueId } = req.body;

    try {
        let changes = 0;

        if (issueId === 'DUPLICATE_STATS') {
            // 1. Identical Stats Cleanup (Batch Optimized)
            const identicalSql = `
                SELECT group_concat(stat_id) as stat_ids
                FROM V3_Player_Stats
                GROUP BY player_id, season_year, league_id, games_appearences, goals_total
                HAVING COUNT(*) > 1
             `;

            const idRows = await new Promise((resolve, reject) => {
                db.all(identicalSql, (err, rows) => err ? reject(err) : resolve(rows));
            });

            const toRemovePhase1 = [];
            for (const row of idRows) {
                const ids = row.stat_ids.split(',').map(Number);
                const keepId = Math.max(...ids); // Prefer newest record (Max ID)
                const removeIds = ids.filter(id => id !== keepId);
                toRemovePhase1.push(...removeIds);
            }

            if (toRemovePhase1.length > 0) {
                const chunkSize = 500;
                for (let i = 0; i < toRemovePhase1.length; i += chunkSize) {
                    const chunk = toRemovePhase1.slice(i, i + chunkSize);
                    const delSql = `DELETE FROM V3_Player_Stats WHERE stat_id IN (${chunk.join(',')})`;
                    await new Promise(r => db.run(delSql, (err) => {
                        if (!err) changes += chunk.length;
                        r();
                    }));
                }
            }

            // 2. Fragmented IDs Cleanup (Batch Optimized)
            const fragmentedSql = `
                SELECT s.player_id, s.season_year, l.name as league_name, GROUP_CONCAT(DISTINCT s.league_id) as league_ids
                FROM V3_Player_Stats s
                JOIN V3_Leagues l ON s.league_id = l.league_id
                GROUP BY s.player_id, s.season_year, l.name
                HAVING COUNT(*) > 1
             `;

            const fragRows = await new Promise((resolve, reject) => {
                db.all(fragmentedSql, (err, rows) => err ? reject(err) : resolve(rows));
            });

            const toRemovePhase2 = [];
            for (const g of fragRows) {
                const ids = g.league_ids.split(',').map(Number);
                if (ids.length < 2) continue;

                // We only check if duplicates STILL exist (Phase 1 might have deleted them if stats were identical)
                // But checking individually is expensive.
                // Strategy: We optimistically mark for deletion.
                // If stat_id was already deleted in Phase 1, DELETE query just ignores it.

                // However, we need STAT IDs to delete efficiently.
                // The query above gives LEAGUE IDs.
                // We need to find the stats for these (player, season, REMOVE_LEAGUE_IDs).
                const keepLeagueId = Math.min(...ids);
                const removeLeagueIds = ids.filter(id => id !== keepLeagueId);

                // This part is trickier to batch because IDs are specific to Player/Season.
                // Better to execute per group here, OR fetch stat_ids in the query.
                // Let's stick to per-group logic for Phase 2 but minimal queries.

                if (removeLeagueIds.length > 0) {
                    const delSql = `DELETE FROM V3_Player_Stats WHERE player_id = ? AND season_year = ? AND league_id IN (${removeLeagueIds.join(',')})`;
                    await new Promise(r => db.run(delSql, [g.player_id, g.season_year], function (err) {
                        if (!err) changes += this.changes;
                        r();
                    }));
                }
            }
        }

        res.json({ success: true, changes, message: `Successfully resolved ${changes} duplicate records.` });

    } catch (e) {
        console.error("Fix failed", e);
        res.status(500).json({ error: e.message });
    }
};

/**
 * GET /api/v3/admin/health/leagues
 */
export const getLeagueNames = async (req, res) => {
    try {
        const sql = `SELECT DISTINCT name, country_id FROM V3_Leagues ORDER BY name`;
        const rows = await new Promise((resolve, reject) => {
            db.all(sql, [], (err, rows) => err ? reject(err) : resolve(rows));
        });
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

/**
 * POST /api/v3/admin/health/check-league
 */
export const checkLeagueHealthName = async (req, res) => {
    const { leagueName } = req.body;
    try {
        const idsSql = `SELECT league_id FROM V3_Leagues WHERE name = ?`;
        const ids = await new Promise((resolve, reject) => {
            db.all(idsSql, [leagueName], (err, rows) => err ? reject(err) : resolve(rows.map(r => r.league_id)));
        });

        if (ids.length === 0) return res.json({ status: 'CLEAN', issues: [] });

        const placeholders = ids.map(() => '?').join(',');

        const fetchSql = `
            SELECT 
                p.name as player_name, 
                s.player_id, s.season_year, s.stat_id, s.team_id, t.name as team_name, s.league_id,
                s.games_appearences, s.goals_total
            FROM V3_Player_Stats s
            JOIN V3_Players p ON s.player_id = p.player_id
            LEFT JOIN V3_Teams t ON s.team_id = t.team_id
            WHERE s.league_id IN (${placeholders})
            AND (s.player_id, s.season_year) IN (
                SELECT s2.player_id, s2.season_year
                FROM V3_Player_Stats s2
                WHERE s2.league_id IN (${placeholders})
                GROUP BY s2.player_id, s2.season_year
                HAVING COUNT(*) > 1
            )
            ORDER BY s.player_id, s.season_year
        `;

        const params = [...ids, ...ids];

        const rows = await new Promise((resolve, reject) => {
            db.all(fetchSql, params, (err, rows) => err ? reject(err) : resolve(rows));
        });

        const issues = [];
        const groups = {};
        for (const row of rows) {
            const key = `${row.player_id}-${row.season_year}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
        }

        for (const key in groups) {
            const entries = groups[key];
            if (entries.length < 2) continue;

            let hasIdentical = false;
            let sampleMsg = "";

            for (let i = 0; i < entries.length; i++) {
                for (let j = i + 1; j < entries.length; j++) {
                    const a = entries[i];
                    const b = entries[j];

                    if (a.games_appearences === b.games_appearences && a.goals_total === b.goals_total) {
                        hasIdentical = true;
                        sampleMsg = `${a.team_name || 'Unknown'} & ${b.team_name || 'Unknown'} (G:${a.goals_total})`;
                        break;
                    }
                }
                if (hasIdentical) break;
            }

            if (hasIdentical) {
                issues.push({
                    player_name: entries[0].player_name,
                    season_year: entries[0].season_year,
                    count: entries.length,
                    details: sampleMsg || "Identical Stats detected"
                });
            }
        }

        if (issues.length > 0) {
            res.json({
                status: 'ISSUES',
                issueType: 'DUPLICATE_STATS',
                count: issues.length,
                sample: issues.slice(0, 10)
            });
        } else {
            res.json({ status: 'CLEAN', issues: [] });
        }

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
