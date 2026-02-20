import db from '../../config/database.js';
import { syncLeagueEventsService, fetchAndStoreEvents, delay } from '../../services/v3/fixtureService.js';

/**
 * GET /api/v3/fixtures/events/candidates
 * Find leagues/seasons with finished matches that are missing events in local DB.
 */
export const getEventCandidates = async (req, res) => {
    try {
        const sql = `
            SELECT 
                l.name as league_name,
                l.logo_url,
                c.name as country_name,
                c.importance_rank,
                f.league_id,
                f.season_year,
                COUNT(f.fixture_id) as total_finished,
                COUNT(f.fixture_id) - COUNT(CASE WHEN fe.fixture_id IS NOT NULL THEN 1 END) as missing_events
            FROM V3_Fixtures f
            JOIN V3_Leagues l ON f.league_id = l.league_id
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Events) fe ON f.fixture_id = fe.fixture_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
            GROUP BY f.league_id, f.season_year
            HAVING missing_events > 0
            ORDER BY c.importance_rank ASC, c.name ASC, l.name ASC, f.season_year DESC
        `;

        const candidates = db.all(sql);
        res.json(candidates);
    } catch (error) {
        console.error('Error finding event candidates:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/v3/fixtures/events/sync
 * Trigger sync of events for specific fixtures or a whole league/season.
 * Body: { league_id, season_year, limit = 50 } OR { fixture_ids: [] }
 */
export const syncFixtureEvents = async (req, res) => {
    const { league_id, season_year, fixture_ids, limit = 50 } = req.body;

    try {
        if (fixture_ids && fixture_ids.length > 0) {
            // Manual list sync
            const results = { total: fixture_ids.length, success: 0, failed: 0 };
            for (const id of fixture_ids) {
                try {
                    await fetchAndStoreEvents(id); // Will lookup API ID if needed
                    results.success++;
                    await delay(200);
                } catch (e) {
                    results.failed++;
                }
            }
            return res.json({ message: 'Sync complete (id list)', results });
        }

        if (league_id && season_year) {
            // Use service
            const results = await syncLeagueEventsService(league_id, season_year, limit);
            return res.json({ message: 'Sync complete (league)', results });
        }

        return res.status(400).json({ error: 'Must provide league_id/season_year or fixture_ids' });

    } catch (error) {
        console.error('Error in syncFixtureEvents:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/fixtures/:id/events
 * Serve events from local DB
 */
export const getFixtureEvents = (req, res) => {
    const { id } = req.params;

    try {
        const events = db.all(`
            SELECT 
                fe.*,
                CASE 
                    WHEN fe.team_id = f.home_team_id THEN 1
                    WHEN th.api_id = fe.team_id THEN 1
                    ELSE 0 
                END as is_home_team
            FROM V3_Fixture_Events fe
            JOIN V3_Fixtures f ON fe.fixture_id = f.fixture_id
            LEFT JOIN V3_Teams th ON f.home_team_id = th.team_id
            WHERE fe.fixture_id = ? 
            ORDER BY fe.time_elapsed ASC, fe.extra_minute ASC
        `, [id]);

        res.json(events);
    } catch (error) {
        console.error('Error fetching fixture events:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/fixtures/:id
 * Get full fixture details (Header info)
 */
export const getFixtureDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const fixture = await db.get(`
            SELECT 
                f.*,
                th.name as home_name, th.logo_url as home_logo,
                ta.name as away_name, ta.logo_url as away_logo,
                l.name as league_name, l.logo_url as league_logo, c.flag_url as country_flag
            FROM V3_Fixtures f
            JOIN V3_Teams th ON f.home_team_id = th.team_id
            JOIN V3_Teams ta ON f.away_team_id = ta.team_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE f.fixture_id = ?
        `, [id]);

        if (!fixture) return res.status(404).json({ error: "Fixture not found" });
        res.json(fixture);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
