import db from '../../config/database.js';
import axios from 'axios';
import * as ImportControl from './importControlService.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import ImportStatusService from './importStatusService.js';
import { IMPORT_STATUS } from './importStatusConstants.js';

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
export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url, retries = 3, backoff = 2000) => {
    try {
        return await api.get(url);
    } catch (err) {
        if (err.response?.status === 429 && retries > 0) {
            console.warn(`⚠️ Rate Limit 429. Pausing ${backoff}ms...`);
            await delay(backoff);
            return fetchWithRetry(url, retries - 1, backoff * 2);
        }
        throw err;
    }
};

/**
 * Internal Service: Sync events for a specific league/season (Catch-up mode)
 * @param {number} leagueId 
 * @param {number} seasonYear 
 * @param {number} limit 
 * @param {function} sendLog
 */
export const syncLeagueEventsService = async (leagueId, seasonYear, limit = 50, sendLog = null) => {
    const log = (msg, type = 'info') => {
        console.log(msg);
        if (sendLog) sendLog(msg, type);
    };

    log(`📡 Service: Auto-syncing events for League ${leagueId}/${seasonYear}...`);

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
        const targetFixtures = db.all(sql, cleanParams([leagueId, seasonYear, limit]));

        if (targetFixtures.length === 0) {
            log('   ✅ No missing events found for this league/season.', 'success');
            return { total: 0, success: 0, failed: 0 };
        }

        log(`   Found ${targetFixtures.length} fixtures missing events.`);
        let success = 0;
        let failed = 0;

        // Optimized for high-throughput (targeting ~450 RPM)
        const CHUNK_SIZE = 5;
        for (let i = 0; i < targetFixtures.length; i += CHUNK_SIZE) {
            // US_270: Check if we should abort or pause
            await ImportControl.checkAbortOrPause(sendLog);

            const chunk = targetFixtures.slice(i, i + CHUNK_SIZE);

            if (sendLog && sendLog.emit && i % 10 === 0) {
                sendLog.emit({ type: 'progress', step: 'events', current: i + chunk.length, total: targetFixtures.length, label: `Syncing Events: ${i + chunk.length}/${targetFixtures.length}` });
            }

            await Promise.all(chunk.map(async (fixture) => {
                try {
                    await fetchAndStoreEvents(fixture.fixture_id, fixture.api_id);
                    success++;
                } catch (err) {
                    console.error(`   ❌ Failed fixture ${fixture.fixture_id}: ${err.message}`);
                    failed++;
                }
            }));

            // Aggressive delay: 5 calls every 700ms ~= 428 RPM
            await delay(700);
        }
        if (success > 0) {
            ImportStatusService.setStatus(leagueId, seasonYear, 'events', failed === 0 ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.PARTIAL);
        }

        return { total: targetFixtures.length, success, failed };

    } catch (error) {
        console.error('Service Error in syncLeagueEventsService:', error);
        throw error;
    }
};

/**
 * Internal helper to fetch from API and store to DB
 */
export async function fetchAndStoreEvents(localFixtureId, apiFixtureId) {
    // If we only have local ID, we need to look up API ID. 
    if (!apiFixtureId) {
        const row = db.get('SELECT api_id FROM V3_Fixtures WHERE fixture_id = ?', cleanParams([localFixtureId]));
        if (!row) throw new Error(`Fixture ${localFixtureId} not found locally`);
        apiFixtureId = row.api_id;
    }

    // Call API: fixtures?id={id} with retry logic
    const response = await fetchWithRetry(`/fixtures?id=${apiFixtureId}`);

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
        db.run('DELETE FROM V3_Fixture_Events WHERE fixture_id = ?', cleanParams([localFixtureId]));

        const insertSql = `
            INSERT INTO V3_Fixture_Events 
            (fixture_id, time_elapsed, extra_minute, team_id, player_id, player_name, assist_id, assist_name, type, detail, comments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const ev of events) {
            // Must resolve TEAM ID to local ID, otherwise we store API ID which mismatches V3_Fixtures
            const localTeamId = db.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", cleanParams([ev.team.id]))?.team_id || ev.team.id; // Fallback to raw if not found, but should find

            db.run(insertSql, cleanParams([
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
            ]));
        }

        db.run('COMMIT');
    } catch (err) {
        try { db.run('ROLLBACK'); } catch (e) { /* ignore rollback error */ }
        throw err;
    }
}
