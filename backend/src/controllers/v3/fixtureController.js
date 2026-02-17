import db from '../../config/database_v3.js';
import axios from 'axios';

const API_KEY = process.env.API_FOOTBALL_KEY;
const API_BASE_URL = 'https://v3.football.api-sports.io';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
    }
});

// Helper to delay requests (rate limiting)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
 * Internal Service: Sync events for a specific league/season (Catch-up mode)
 * @param {number} leagueId 
 * @param {number} seasonYear 
 * @param {number} limit 
 */
export const syncLeagueEventsService = async (leagueId, seasonYear, limit = 50) => {
    console.log(`📡 Service: Auto-syncing events for League ${leagueId}/${seasonYear}...`);

    try {
        const sql = `
            SELECT f.fixture_id, f.api_id, f.status_short
            FROM V3_Fixtures f
            LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Events) fe ON f.fixture_id = fe.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
            AND f.status_short IN ('FT', 'AET', 'PEN')
            AND fe.fixture_id IS NULL
            LIMIT ?
        `;
        const targetFixtures = db.all(sql, [leagueId, seasonYear, limit]);

        if (targetFixtures.length === 0) {
            console.log('   ✅ No missing events found for this league/season.');
            return { total: 0, success: 0, failed: 0 };
        }

        console.log(`   found ${targetFixtures.length} fixtures missing events.`);
        let success = 0;
        let failed = 0;

        for (const fixture of targetFixtures) {
            try {
                await fetchAndStoreEvents(fixture.fixture_id, fixture.api_id);
                success++;
                await delay(200); // Rate limit protection
            } catch (err) {
                console.error(`   ❌ Failed fixture ${fixture.fixture_id}: ${err.message}`);
                failed++;
            }
        }
        return { total: targetFixtures.length, success, failed };

    } catch (error) {
        console.error('Service Error in syncLeagueEventsService:', error);
        throw error;
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
 * Internal helper to fetch from API and store to DB
 */
/**
 * Internal helper to fetch from API and store to DB
 */
export async function fetchAndStoreEvents(localFixtureId, apiFixtureId) {
    // If we only have local ID, we need to look up API ID. 
    if (!apiFixtureId) {
        const row = db.get('SELECT api_id FROM V3_Fixtures WHERE fixture_id = ?', [localFixtureId]);
        if (!row) throw new Error(`Fixture ${localFixtureId} not found locally`);
        apiFixtureId = row.api_id;
    }

    // Call API: fixtures?id={id}
    const response = await api.get(`/fixtures?id=${apiFixtureId}`);

    if (!response.data.response || response.data.response.length === 0) {
        console.warn(`   No data returned for fixture ${apiFixtureId}`);
        return;
    }

    const events = response.data.response[0].events; // Array of events

    if (!events || events.length === 0) {
        // No events
        return;
    }

    try {
        // Run in transaction
        db.run('BEGIN TRANSACTION');

        // Clear existing events for this fixture just in case (e.g. re-sync)
        db.run('DELETE FROM V3_Fixture_Events WHERE fixture_id = ?', [localFixtureId]);

        const insertSql = `
            INSERT INTO V3_Fixture_Events 
            (fixture_id, time_elapsed, extra_minute, team_id, player_id, player_name, assist_id, assist_name, type, detail, comments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const ev of events) {
            // Must resolve TEAM ID to local ID, otherwise we store API ID which mismatches V3_Fixtures
            const localTeamId = db.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", [ev.team.id])?.team_id || ev.team.id; // Fallback to raw if not found, but should find

            db.run(insertSql, [
                localFixtureId,
                ev.time.elapsed,
                ev.time.extra, // API field is usually 'extra', mapped to DB 'extra_minute'
                localTeamId,
                ev.player.id,
                ev.player.name,
                ev.assist.id,
                ev.assist.name,
                ev.type,
                ev.detail,
                ev.comments
            ]);
        }

        db.run('COMMIT');
    } catch (err) {
        try { db.run('ROLLBACK'); } catch (e) { /* ignore rollback error */ }
        throw err;
    }
}

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
