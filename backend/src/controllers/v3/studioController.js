import db from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/v3/studio/meta/stats
 * Returns available stats from V3_Player_Stats schema with contract metadata
 */
export const getStudioStats = (req, res) => {
    const stats = [
        { key: 'goals_total', label: 'Goals', category: 'Attacking', unit: 'integer' },
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
        { key: 'games_appearences', label: 'Apps', category: 'General', unit: 'integer' },
        { key: 'games_rating', label: 'Rating', category: 'General', unit: 'decimal' }
    ];
    res.json({ success: true, data: stats });
};

/**
 * GET /api/v3/studio/meta/nationalities
 * Returns distinct nationalities for the Country Dropdown
 */
export const getStudioNationalities = async (req, res) => {
    try {
        // US_121: Sort by Top 10 nations by database weight (player count) first, then alphabetical
        const sql = `
            WITH Stats AS (
                SELECT nationality, COUNT(*) as count
                FROM V3_Players
                WHERE nationality IS NOT NULL
                GROUP BY nationality
            ),
            Top10 AS (
                SELECT nationality FROM Stats ORDER BY count DESC LIMIT 10
            )
            SELECT nationality, 
                   (CASE WHEN nationality IN (SELECT nationality FROM Top10) THEN 0 ELSE 1 END) as group_rank
            FROM Stats
            ORDER BY group_rank ASC, nationality ASC
        `;
        const rows = await db.all(sql);
        res.json({ success: true, data: rows.map(r => r.nationality) });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching nationalities');
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/v3/studio/meta/leagues
 * Returns Leagues with valid data in V3_Player_Stats, grouped by Country
 */
export const getStudioLeagues = async (req, res) => {
    try {
        const sql = `
            SELECT DISTINCT 
                l.league_id, 
                l.name as league_name, 
                l.logo_url,
                l.type as league_type,
                l.importance_rank as league_rank,
                c.country_id,
                c.name as country_name,
                c.flag_url,
                c.importance_rank as country_rank
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_Player_Stats s ON l.league_id = s.league_id
            ORDER BY c.importance_rank ASC, c.name ASC, l.importance_rank ASC, l.name ASC
        `;
        const rows = await db.all(sql);

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
                logo: row.logo_url,
                type: row.league_type
            });
            return acc;
        }, {});

        res.json({ success: true, data: Object.values(grouped) });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching studio leagues');
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/v3/studio/meta/players
 * Search endpoint for manual selection - Enhanced for Uniqueness
 */
export const searchStudioPlayers = async (req, res) => {
    const { search, league_id, season } = req.query;

    if (!search || search.length < 3) {
        return res.json({ success: true, data: [] });
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

        sql += ` GROUP BY p.player_id ORDER BY COALESCE(p.scout_rank, 0) DESC, last_season DESC, p.name ASC LIMIT 20`;
        const rows = await db.all(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        logger.error({ err: error }, 'Error searching studio players');
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * GET /api/v3/studio/meta/teams
 * Search endpoint for Club selection
 */
export const searchStudioTeams = async (req, res) => {
    const { search } = req.query;

    if (!search || search.length < 2) {
        return res.json({ success: true, data: [] });
    }

    try {
        const sql = `
            SELECT t.team_id, t.name, t.logo_url, c.name as country_name
            FROM V3_Teams t
            LEFT JOIN V3_Countries c ON t.country = c.name
            WHERE t.name LIKE ?
            ORDER BY COALESCE(t.scout_rank, 0) DESC, COALESCE(c.importance_rank, 999) ASC, t.name ASC
            LIMIT 20
        `;
        const params = [`%${search}%`];
        const rows = await db.all(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        logger.error({ err: error }, 'Error searching studio teams');
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- Private Studio Helpers ---

const getRoundNumber = (roundStr) => {
    if (!roundStr || typeof roundStr !== 'string') return 0;
    const parts = roundStr.split('-');
    const lastPart = parts[parts.length - 1].trim();
    const num = Number.parseInt(lastPart);
    return Number.isNaN(num) ? 0 : num;
};

const buildStudioWhereClause = (filters, selection, stat) => {
    const [minYear, maxYear] = filters.years;
    let whereClauses = [`s.season_year BETWEEN ? AND ?`];
    let params = [minYear, maxYear];

    const addInClause = (items, column) => {
        if (items && items.length > 0) {
            whereClauses.push(`${column} IN (${items.map(() => '?').join(',')})`);
            params.push(...items);
        }
    };

    addInClause(filters.leagues, 's.league_id');
    addInClause(filters.countries, 'p.nationality');
    addInClause(filters.teams, 's.team_id');

    const manualPlayers = selection?.mode === 'manual' ? selection.players : [];
    addInClause(manualPlayers, 's.player_id');

    return {
        sql: `
            SELECT s.season_year, s.player_id, p.name as player_name, p.photo_url, t.name as team_name, t.logo_url as team_logo, SUM(s.${stat}) as value
            FROM V3_Player_Stats s
            JOIN V3_Players p ON s.player_id = p.player_id
            JOIN V3_Teams t ON s.team_id = t.team_id
            WHERE ${whereClauses.join(' AND ')}
            GROUP BY s.season_year, s.player_id, p.name, p.photo_url, t.name, t.logo_url
            ORDER BY s.season_year ASC
        `,
        params
    };
};

/**
 * POST /api/v3/studio/query
 */
export const queryStudioData = async (req, res) => {
    const { stat, filters, selection, options } = req.body;
    if (!stat || !filters?.years || filters.years.length !== 2) return res.status(400).json({ success: false, error: 'Stat key and Years range required' });

    const allowedStats = ['goals_total', 'goals_assists', 'shots_total', 'shots_on', 'dribbles_success', 'passes_key', 'tackles_total', 'duels_won', 'duels_total', 'cards_yellow', 'cards_red', 'games_minutes', 'games_appearences', 'games_rating', 'passes_accuracy'];
    if (!allowedStats.includes(stat)) return res.status(400).json({ success: false, error: 'Invalid stat key' });

    try {
        const { sql, params } = buildStudioWhereClause(filters, selection, stat);
        const rows = await db.all(sql, params);

        const runningTotals = {};
        const playerMeta = {};
        rows.forEach(row => {
            playerMeta[row.player_id] = { id: row.player_id, label: row.player_name, subLabel: row.team_name, image: row.photo_url, team_logo: row.team_logo };
        });

        const cumulative = options?.cumulative === true;
        const topN = selection?.mode === 'top_n' ? (selection.value || 10) : 1000;
        const timeline = [];
        const yearsSet = new Set(rows.map(r => r.season_year));
        const sortedYears = Array.from(yearsSet).sort((a, b) => a - b);

        if (sortedYears.length > 0) {
            timeline.push({ year: sortedYears[0] - 1, records: Object.values(playerMeta).map(m => ({ ...m, value: 0 })) });
        }

        sortedYears.forEach(year => {
            const yearRows = rows.filter(r => r.season_year === year);
            yearRows.forEach(row => {
                runningTotals[row.player_id] = (cumulative ? (runningTotals[row.player_id] || 0) : 0) + row.value;
            });
            const frameRecords = Object.entries(runningTotals).map(([pid, val]) => ({ ...playerMeta[pid], value: Number.parseFloat(val.toFixed(2)) }));
            frameRecords.sort((a, b) => b.value - a.value);
            timeline.push({ year, records: frameRecords.slice(0, topN) });
        });

        res.json({ success: true, data: { meta: { stat, cumulative, count: rows.length }, timeline } });
    } catch (error) {
        logger.error({ err: error }, "Error in queryStudioData");
        res.status(500).json({ success: false, error: 'Data aggregation failed' });
    }
};

/**
 * POST /api/v3/studio/query/league-rankings
 */
export const queryLeagueRankings = async (req, res) => {
    const { league_id, season } = req.body;
    if (!league_id || !season) return res.status(400).json({ success: false, error: 'league_id and season required' });

    try {
        const fixtures = await db.all(`
            SELECT f.*, t1.name as home_team_name, t1.logo_url as home_team_logo, t2.name as away_team_name, t2.logo_url as away_team_logo
            FROM V3_Fixtures f JOIN V3_Teams t1 ON f.home_team_id = t1.team_id JOIN V3_Teams t2 ON f.away_team_id = t2.team_id
            WHERE f.league_id = ? AND f.season_year = ? AND f.status_short = 'FT' ORDER BY f.date ASC
        `, [league_id, season]);

        const league = await db.get(`SELECT name, logo_url FROM V3_Leagues WHERE league_id = ?`, [league_id]);
        if (fixtures.length === 0) return res.json({ success: true, data: { meta: { type: 'league_rankings', league_logo: league?.logo_url, league_name: league?.name }, timeline: [] } });

        const teamsStats = {};
        const roundsData = {};
        fixtures.forEach(f => {
            const rd = getRoundNumber(f.round);
            if (rd === 0) return;
            if (!roundsData[rd]) roundsData[rd] = [];
            roundsData[rd].push(f);
            [f.home_team_id, f.away_team_id].forEach((tid, idx) => {
                if (!teamsStats[tid]) teamsStats[tid] = { id: tid, label: idx === 0 ? f.home_team_name : f.away_team_name, image: idx === 0 ? f.home_team_logo : f.away_team_logo, points: 0, gd: 0, gf: 0 };
            });
        });

        const timeline = [{ round: 0, records: Object.values(teamsStats).map((t, idx) => ({ ...t, value: 0, rank: idx + 1 })) }];
        const sortedRounds = Object.keys(roundsData).map(Number).sort((a, b) => a - b);

        sortedRounds.forEach(rd => {
            roundsData[rd].forEach(m => {
                const home = teamsStats[m.home_team_id], away = teamsStats[m.away_team_id];
                const gh = m.goals_home || 0, ga = m.goals_away || 0;
                home.gf += gh; away.gf += ga; home.gd += (gh - ga); away.gd += (ga - gh);
                if (gh > ga) home.points += 3; else if (ga > gh) away.points += 3; else { home.points += 1; away.points += 1; }
            });

            const frameRecords = Object.values(teamsStats).map(t => ({ id: t.id, label: t.label, image: t.image, team_logo: t.image, value: t.points, gd: t.gd, gf: t.gf }))
                .sort((a, b) => b.value - a.value || b.gd - a.gd || b.gf - a.gf);

            timeline.push({ round: rd, records: frameRecords.map((r, idx) => ({ ...r, rank: idx + 1 })) });
        });

        res.json({ success: true, data: { meta: { type: 'league_rankings', league_logo: league?.logo_url, league_name: league?.name }, timeline } });
    } catch (error) {
        logger.error({ err: error }, "Error in queryLeagueRankings");
        res.status(500).json({ success: false, error: 'League processing failed' });
    }
};
