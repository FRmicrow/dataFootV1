import db from '../../config/database_v3.js';

/**
 * GET /api/v3/studio/meta/stats
 * Returns available stats from V3_Player_Stats schema with contract metadata
 */
export const getStudioStats = (req, res) => {
    const stats = [
        { key: 'goals_total', label: 'Total Goals', category: 'Attacking', unit: 'integer' },
        { key: 'goals_assists', label: 'Assists', category: 'Attacking', unit: 'integer' },
        { key: 'shots_total', label: 'Total Shots', category: 'Shooting', unit: 'integer' },
        { key: 'shots_on', label: 'Shots on Target', category: 'Shooting', unit: 'integer' },
        // Mapping requested by user: Duels -> Dribbles label
        { key: 'duels_won', label: 'Successful Dribbles (Duels Won)', category: 'Technical', unit: 'integer' },
        { key: 'duels_total', label: 'Total Dribbles (Duels Total)', category: 'Technical', unit: 'integer' },
        { key: 'dribbles_success', label: 'Real Dribbles Success', category: 'Technical', unit: 'integer' }, // Keeping original too just in case
        { key: 'passes_key', label: 'Key Passes', category: 'Playmaking', unit: 'integer' },
        { key: 'passes_accuracy', label: 'Pass Accuracy', category: 'Playmaking', unit: 'integer' },
        { key: 'tackles_total', label: 'Total Tackles', category: 'Defending', unit: 'integer' },
        { key: 'cards_yellow', label: 'Yellow Cards', category: 'Discipline', unit: 'integer' },
        { key: 'cards_red', label: 'Red Cards', category: 'Discipline', unit: 'integer' },
        { key: 'games_minutes', label: 'Minutes Played', category: 'General', unit: 'integer' },
        { key: 'games_appearences', label: 'Appearances', category: 'General', unit: 'integer' },
        { key: 'games_rating', label: 'Average Rating', category: 'General', unit: 'decimal' }
    ];
    res.json(stats);
};

/**
 * GET /api/v3/studio/meta/nationalities
 * Returns distinct nationalities for the Country Dropdown
 */
export const getStudioNationalities = (req, res) => {
    try {
        const sql = `SELECT DISTINCT nationality FROM V3_Players WHERE nationality IS NOT NULL ORDER BY nationality ASC`;
        const rows = db.all(sql);
        res.json(rows.map(r => r.nationality));
    } catch (error) {
        console.error('Error fetching nationalities:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/studio/meta/leagues
 * Returns Leagues with valid data in V3_Player_Stats, grouped by Country
 */
export const getStudioLeagues = (req, res) => {
    try {
        const sql = `
            SELECT DISTINCT 
                l.league_id, 
                l.name as league_name, 
                l.logo_url,
                c.country_id,
                c.name as country_name,
                c.flag_url,
                c.importance_rank
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_Player_Stats s ON l.league_id = s.league_id
            ORDER BY c.importance_rank ASC, c.name ASC, l.name ASC
        `;
        const rows = db.all(sql);

        // Group by country
        const grouped = rows.reduce((acc, row) => {
            if (!acc[row.country_name]) {
                acc[row.country_name] = {
                    country: row.country_name,
                    flag: row.flag_url,
                    leagues: []
                };
            }
            acc[row.country_name].leagues.push({
                id: row.league_id,
                name: row.league_name,
                logo: row.logo_url
            });
            return acc;
        }, {});

        res.json(Object.values(grouped));
    } catch (error) {
        console.error('Error fetching studio leagues:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/studio/meta/players
 * Search endpoint for manual selection - Enhanced for Uniqueness
 */
export const searchStudioPlayers = (req, res) => {
    const { search, league_id, season } = req.query;

    if (!search || search.length < 3) {
        return res.json([]);
    }

    try {
        // Query to get distinct players, prioritizing most recent team info
        // We use GROUP BY player_id to ensure single entry per player
        let sql = `
            SELECT 
                p.player_id, 
                p.name, 
                p.firstname, 
                p.lastname, 
                p.photo_url,
                MAX(s.season_year) as last_season,
                (SELECT t.name FROM V3_Teams t 
                 JOIN V3_Player_Stats s2 ON t.team_id = s2.team_id 
                 WHERE s2.player_id = p.player_id 
                 ORDER BY s2.season_year DESC LIMIT 1) as team_name
            FROM V3_Players p
            JOIN V3_Player_Stats s ON p.player_id = s.player_id
            WHERE (p.name LIKE ? OR p.lastname LIKE ?)
        `;
        const params = [`%${search}%`, `%${search}%`];

        if (league_id) {
            sql += ` AND s.league_id = ?`;
            params.push(league_id);
        }
        if (season) {
            sql += ` AND s.season_year = ?`;
            params.push(season);
        }

        sql += ` GROUP BY p.player_id LIMIT 20`;

        const rows = db.all(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error searching studio players:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/v3/studio/query
 * The Data Aggregation Engine - Strict Contract Implementation
 */
export const queryStudioData = (req, res) => {
    const { stat, filters, selection, options } = req.body;

    // 1. Validation
    if (!stat) return res.status(400).json({ error: 'Stat key is required' });
    if (!filters || !filters.years || filters.years.length !== 2) {
        return res.status(400).json({ error: 'Years range [min, max] is required' });
    }

    // Security check for stat column
    const allowedStats = [
        'goals_total', 'goals_assists', 'shots_total', 'shots_on',
        'dribbles_success', 'passes_key', 'tackles_total', 'duels_won', 'duels_total', // Added duels_total
        'cards_yellow', 'cards_red', 'games_minutes', 'games_appearences', 'games_rating', 'passes_accuracy'
    ];
    if (!allowedStats.includes(stat)) {
        return res.status(400).json({ error: 'Invalid stat key requested' });
    }

    try {
        const [minYear, maxYear] = filters.years;
        const cumulative = options?.cumulative === true;
        const topN = selection?.mode === 'top_n' ? (selection.value || 10) : 1000;
        const manualPlayers = selection?.mode === 'manual' ? selection.players : [];

        // 2. Build Query
        let whereClauses = [`s.season_year BETWEEN ? AND ?`];
        let params = [minYear, maxYear];

        // League Filter
        if (filters.leagues && filters.leagues.length > 0) {
            const placeholders = filters.leagues.map(() => '?').join(',');
            whereClauses.push(`s.league_id IN (${placeholders})`);
            params.push(...filters.leagues);
        }

        // Country Filter (Nationality)
        // User requested: "If i select 'nationality' get the data when V3_player.nationality = selected country"
        if (filters.countries && filters.countries.length > 0) {
            const placeholders = filters.countries.map(() => '?').join(',');
            whereClauses.push(`p.nationality IN (${placeholders})`);
            params.push(...filters.countries);
        }

        // Manual Players Filter
        if (manualPlayers.length > 0) {
            const placeholders = manualPlayers.map(() => '?').join(',');
            whereClauses.push(`s.player_id IN (${placeholders})`);
            params.push(...manualPlayers);
        }

        // We fetch Raw Data: Player | Year | Team | Value
        // We do NOT sum by player yet if we want year-by-year granularity for the timeline.
        // But we DO sum if a player played for multiple teams in the SAME year?
        // Usually simpler to take the max or sum. Let's SUM for the year.
        const sql = `
            SELECT 
                s.season_year,
                s.player_id,
                p.name as player_name,
                p.photo_url,
                t.name as team_name,
                t.logo_url as team_logo,
                SUM(s.${stat}) as value
            FROM V3_Player_Stats s
            JOIN V3_Players p ON s.player_id = p.player_id
            JOIN V3_Teams t ON s.team_id = t.team_id
            JOIN V3_Leagues l ON s.league_id = l.league_id 
            JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE ${whereClauses.join(' AND ')}
            GROUP BY s.season_year, s.player_id
            ORDER BY s.season_year ASC
        `;

        const rows = db.all(sql, params);

        // 3. Process Data (Aggregation & Normalization)

        // Map to store cumulative totals: { player_id: total }
        const runningTotals = {};

        // Map to store static player info: { player_id: { name, photo, team... } }
        const playerMeta = {};

        // Prepare timeline buckets
        const timeline = [];

        // Populate player meta and process rows
        rows.forEach(row => {
            // Update meta (last seen team will overwrite, which is usually desired behavior for "current team")
            playerMeta[row.player_id] = {
                id: row.player_id,
                label: row.player_name,
                subLabel: row.team_name,
                image: row.photo_url,
                team_logo: row.team_logo
            };
        });

        // If Manual Mode, fetch meta for players even if they have 0 stats in range?
        // Query only returns rows matching WHERE clause. 
        // If a manually selected player has NO stats in range, they won't appear.
        // We might want to inject them with 0s if they exist in DB?
        // For now, assume if selected, they appear if they played.

        // ADD INITIAL ZERO FRAME (Year - 1)
        // This is crucial for smooth start animation from 0
        const startFrameRecords = Object.values(playerMeta).map(p => ({
            ...p,
            value: 0,
            rank: 999 // Start off-screen
        }));

        // Only include if manual mode? Or always?
        // Always good to have a "start" frame.
        // But for optimization, keep it minimal.

        timeline.push({
            season: minYear - 1,
            records: selection.mode === 'manual' ? startFrameRecords : [] // Only force 0s for manual? or top N?
        });


        // 4. Build Frames
        // We iterate year by year to handle cumulative logic correctly
        for (let y = minYear; y <= maxYear; y++) {
            const currentYear = y;

            // Get rows for this year
            const yearRows = rows.filter(r => r.season_year === currentYear);

            // Update totals
            yearRows.forEach(row => {
                if (cumulative) {
                    runningTotals[row.player_id] = (runningTotals[row.player_id] || 0) + row.value;
                } else {
                    runningTotals[row.player_id] = row.value;
                }

                // Update team specifically for this year (so the bar shows the correct team at that time)
                if (playerMeta[row.player_id]) {
                    playerMeta[row.player_id].subLabel = row.team_name;
                    playerMeta[row.player_id].team_logo = row.team_logo;
                }
            });

            // If cumulative, we need to include ALL players who have a running total > 0 (even if they didn't play this year)
            // If not cumulative, we only include players who played this year (yearRows)

            let activePlayerIds = [];
            if (cumulative) {
                activePlayerIds = Object.keys(runningTotals);
            } else {
                activePlayerIds = yearRows.map(r => r.player_id);
            }

            // For Manual Mode: Ensure ALL selected players are included, even if 0
            if (selection.mode === 'manual') {
                const manualIds = selection.players.map(String); // ensure string key match
                manualIds.forEach(mid => {
                    if (!runningTotals[mid]) runningTotals[mid] = 0;
                    if (!activePlayerIds.includes(mid)) activePlayerIds.push(mid);
                });
            }

            // Build records for this frame
            let frameRecords = activePlayerIds.map(pid => {
                const val = runningTotals[pid] || 0;
                const meta = playerMeta[pid];
                if (!meta) return null; // Should not happen
                return {
                    id: parseInt(pid),
                    label: meta.label,
                    subLabel: meta.subLabel, // Team name
                    image: meta.image,
                    value: val
                };
            }).filter(Boolean);

            // Filter out zero values if desired? Usually yes.
            if (selection.mode !== 'manual') {
                frameRecords = frameRecords.filter(r => r.value > 0);
            }

            // Sort DESC
            frameRecords.sort((a, b) => b.value - a.value);

            // Apply Top N (only keep top N for the frame)
            // Note: In Bar Chart Race, we usually want to keep a few more for smooth enter/exit animations
            // But strict Top N is safer for performance.
            // Let's keep Top N + 5 for buffer if needed, but contract says "rank" is final.
            // Let's just return Top N as requested strictly.

            // Assign Ranks
            frameRecords.forEach((r, idx) => {
                r.rank = idx + 1;
            });

            // Slice
            if (selection?.mode === 'top_n') {
                frameRecords = frameRecords.slice(0, topN);
            }

            timeline.push({ season: y, records: frameRecords });

            // Note: If timeline has no records for a year, frontend handles empty lists gracefully?
        }

        // 5. Final Response Construction
        const response = {
            meta: {
                stat_key: stat,
                stat_label: allowedStats.find(s => s === stat) || stat, // Could map to pretty label if we had the map handy
                unit: (stat.includes('rating') || stat.includes('ratio')) ? 'decimal' : 'integer'
            },
            timeline: timeline
        };

        res.json(response);

    } catch (error) {
        console.error('Error in queryStudioData:', error);
        res.status(500).json({ error: error.message });
    }
};
