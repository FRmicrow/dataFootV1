import db from '../../config/database.js';
import StatsEngine from '../../services/v3/StatsEngine.js';

export const getLineups = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Try fetching from DB
        const lineups = await db.all(
            "SELECT * FROM V3_Fixture_Lineups WHERE fixture_id = ?",
            [id]
        );

        if (lineups && lineups.length === 2) {
            // Found both teams (Home/Away usually 2 rows)
            // Parse JSON fields
            let data = lineups.map(l => ({
                ...l,
                starting_xi: JSON.parse(l.starting_xi || '[]'),
                substitutes: JSON.parse(l.substitutes || '[]')
            }));

            // Sort Home First
            const fixture = await db.get("SELECT home_team_id FROM V3_Fixtures WHERE fixture_id = ?", [id]);
            if (fixture) {
                data.sort((a, b) => a.team_id === fixture.home_team_id ? -1 : 1);
            }

            return res.json({ source: 'db', lineups: data });
        }

        // 2. Not found or incomplete? Sync from API
        console.log(`[Lineups] Syncing for Fixture ${id}...`);

        // Use StatsEngine to sync (keeps logic centralized)
        const syncedData = await StatsEngine.syncFixtureLineups(id);

        if (!syncedData || syncedData.length === 0) {
            return res.json({ source: 'api', lineups: [], message: 'No lineups available from API.' });
        }

        // Re-fetch from DB to leverage uniform formatting
        const newLineups = await db.all(
            "SELECT * FROM V3_Fixture_Lineups WHERE fixture_id = ?",
            [id]
        );

        let data = newLineups.map(l => ({
            ...l,
            starting_xi: JSON.parse(l.starting_xi || '[]'),
            substitutes: JSON.parse(l.substitutes || '[]')
        }));

        // Sort Home First
        const fixture = await db.get("SELECT home_team_id FROM V3_Fixtures WHERE fixture_id = ?", [id]);
        if (fixture) {
            data.sort((a, b) => a.team_id === fixture.home_team_id ? -1 : 1);
        }

        res.json({ source: 'api_synced', lineups: data });

    } catch (e) {
        console.error("Error fetching lineups:", e);
        res.status(500).json({ error: e.message });
    }
};

/**
 * GET /api/v3/fixtures/lineups/candidates
 * Find leagues/seasons with finished matches missing lineups.
 */
export const getLineupCandidates = async (req, res) => {
    try {
        const sql = `
            SELECT 
                l.name as league_name,
                l.logo_url,
                c.name as country_name,
                c.importance_rank,
                f.league_id,
                f.season_year,
                COUNT(f.fixture_id) as total_fixtures,
                COUNT(f.fixture_id) - COUNT(fl.fixture_id) as missing_lineups
            FROM V3_Fixtures f
            JOIN V3_Leagues l ON f.league_id = l.league_id
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Lineups) fl ON f.fixture_id = fl.fixture_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
            GROUP BY f.league_id, f.season_year
            HAVING missing_lineups > 0
            ORDER BY c.importance_rank ASC, c.name ASC, l.name ASC, f.season_year DESC
        `;

        const candidates = await db.all(sql);
        res.json(candidates);
    } catch (error) {
        console.error('Error finding lineup candidates:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/v3/fixtures/lineups/import
 * Batch import lineups for a league/season or list of fixtures.
 */
export const importLineupsBatch = async (req, res) => {
    const { league_id, season_year, limit = 50 } = req.body;

    try {
        // Find target fixtures
        const sql = `
            SELECT f.fixture_id
            FROM V3_Fixtures f
            LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Lineups) fl ON f.fixture_id = fl.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
            AND f.status_short IN ('FT', 'AET', 'PEN')
            AND fl.fixture_id IS NULL
            LIMIT ?
        `;

        const targets = await db.all(sql, [league_id, season_year, limit]);

        if (targets.length === 0) {
            return res.json({ message: 'No missing lineups found for this selection.', processed: 0 });
        }

        let success = 0;
        let failed = 0;

        // Process sequentially to be safe with rate limits/transactions
        for (const t of targets) {
            try {
                await StatsEngine.syncFixtureLineups(t.fixture_id);
                success++;
                // Small delay to be nice to API? StatsEngine calls are queued but loop is fast
                await new Promise(r => setTimeout(r, 100));
            } catch (e) {
                console.error(`Failed to sync lineup for fixture ${t.fixture_id}:`, e.message);
                failed++;
            }
        }

        res.json({
            message: `Processed ${targets.length} fixtures.`,
            processed: targets.length,
            success,
            failed
        });

    } catch (error) {
        console.error('Error in importLineupsBatch:', error);
        res.status(500).json({ error: error.message });
    }
};
