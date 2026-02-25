
import db from '../../config/database.js';
import { runImportJob } from './leagueImportService.js';
import { syncLeagueEventsService } from './fixtureService.js';
import {
    syncLeagueFixtureStatsService,
    syncLeaguePlayerStatsService
} from './tacticalStatsService.js';
import StatsEngine from './StatsEngine.js';
import footballApi from '../footballApi.js';

/**
 * orchestrates a full missing data sync for an entire league across all seasons.
 * US_040: "One-Click League Full Sync"
 */
export const runDeepSyncLeague = async (leagueId, sendLog) => {
    sendLog(`🚀 Starting Deep Sync for League ID ${leagueId}...`, 'info');

    // 1. Get all seasons for this league
    const seasons = db.all(
        "SELECT * FROM V3_League_Seasons WHERE league_id = ? ORDER BY season_year DESC",
        [leagueId]
    );

    if (seasons.length === 0) {
        sendLog(`⚠️ No seasons found for League ${leagueId}. Initializing default seasons...`, 'warning');
        // Optional: initialize default seasons or throw error
        throw new Error("No seasons initialized for this league.");
    }

    sendLog(`📅 Found ${seasons.length} seasons to inspect.`, 'info');

    let totalTasks = seasons.length * 6; // Expanded to 6 pillars
    let completedTasks = 0;

    for (const season of seasons) {
        const { season_year } = season;
        sendLog(`──────────────────────────────────────────`, 'info');
        sendLog(`📂 Processing Season ${season_year}...`, 'info');

        // Pillar 1: Core (Standings, Fixtures, Players)
        try {
            if (!season.imported_fixtures || !season.imported_players) {
                sendLog(`   [C] Core data missing. Launching Core Import...`, 'info');
                await runImportJob(leagueId, season_year, sendLog, { forceApiId: false, forceRefresh: false });
            } else {
                sendLog(`   [C] Core data already complete. Skipping.`, 'success');
            }
        } catch (err) {
            sendLog(`   ❌ [C] Core sync failed: ${err.message}`, 'error');
        }
        completedTasks++;

        // Pillar 2: Events
        try {
            if (!season.imported_events) {
                sendLog(`   [E] Events missing. Syncing match events...`, 'info');
                const res = await syncLeagueEventsService(leagueId, season_year, 2000, sendLog);
                sendLog(`   ✅ Events synced: ${res.success} fixtures.`, 'success');
            } else {
                sendLog(`   [E] Events already complete. Skipping.`, 'success');
            }
        } catch (err) {
            sendLog(`   ❌ [E] Events sync failed: ${err.message}`, 'error');
        }
        completedTasks++;

        // Pillar 3: Lineups
        try {
            if (!season.imported_lineups) {
                sendLog(`   [L] Lineups missing. Batch importing lineups...`, 'info');
                const lineups = await syncSeasonLineups(leagueId, season_year, sendLog);
                sendLog(`   ✅ Lineups synced: ${lineups.success} fixtures.`, 'success');
            } else {
                sendLog(`   [L] Lineups already complete. Skipping.`, 'success');
            }
        } catch (err) {
            sendLog(`   ❌ [L] Lineups sync failed: ${err.message}`, 'error');
        }
        completedTasks++;

        // Pillar 4: Trophies (Skipped as per current state or if desired)
        completedTasks++;

        // Pillar 5: Fixture Stats (FS)
        try {
            if (!season.imported_fixture_stats) {
                sendLog(`   [FS] Fixture Stats missing. Syncing tactical data...`, 'info');
                const res = await syncLeagueFixtureStatsService(leagueId, season_year, 2000, sendLog);
                sendLog(`   ✅ FS synced: ${res.success} fixtures.`, 'success');
            } else {
                sendLog(`   [FS] FS already complete. Skipping.`, 'success');
            }
        } catch (err) {
            sendLog(`   ❌ [FS] FS sync failed: ${err.message}`, 'error');
        }
        completedTasks++;

        // Pillar 6: Player Stats (PS)
        try {
            if (!season.imported_player_stats) {
                sendLog(`   [PS] Player Stats missing. Syncing granular player data...`, 'info');
                const res = await syncLeaguePlayerStatsService(leagueId, season_year, 2000, sendLog);
                sendLog(`   ✅ PS synced: ${res.success} fixtures.`, 'success');
            } else {
                sendLog(`   [PS] PS already complete. Skipping.`, 'success');
            }
        } catch (err) {
            sendLog(`   ❌ [PS] PS sync failed: ${err.message}`, 'error');
        }
        completedTasks++;

        if (sendLog.emit) {
            sendLog.emit({ type: 'progress', step: 'overall', current: completedTasks, total: totalTasks, label: `Completed Season ${season_year}` });
        }
    }

    sendLog(`🎉 Deep Sync for League ${leagueId} Completed!`, 'complete');
};

/**
 * Helper to sync lineups for a season (re-using logic from controller/StatsEngine)
 */
export async function syncSeasonLineups(leagueId, seasonYear, sendLog) {
    const sql = `
        SELECT f.fixture_id
        FROM V3_Fixtures f
        LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Lineups) fl ON f.fixture_id = fl.fixture_id
        WHERE f.league_id = ? AND f.season_year = ?
        AND f.status_short IN ('FT', 'AET', 'PEN')
        AND fl.fixture_id IS NULL
    `;
    const targets = db.all(sql, [leagueId, seasonYear]);
    let success = 0;
    let failed = 0;

    // Optimized for high-throughput (targeting ~450 RPM)
    const CHUNK_SIZE = 5; // Process 5 fixtures in parallel
    for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
        const chunk = targets.slice(i, i + CHUNK_SIZE);

        if (sendLog.emit && i % 10 === 0) {
            sendLog.emit({ type: 'progress', step: 'lineups', current: i + chunk.length, total: targets.length, label: `Syncing Lineups (${i + chunk.length}/${targets.length})` });
        }

        await Promise.all(chunk.map(async (t) => {
            try {
                await StatsEngine.syncFixtureLineups(t.fixture_id);
                success++;
            } catch (e) {
                failed++;
            }
        }));

        // Aggressive delay: 5 calls / 700ms ~= 7 calls/sec ~= 420 RPM
        await new Promise(r => setTimeout(r, 700));
    }

    if (success > 0) {
        db.run(
            "UPDATE V3_League_Seasons SET imported_lineups = 1, last_sync_lineups = CURRENT_TIMESTAMP WHERE league_id = ? AND season_year = ?",
            [leagueId, seasonYear]
        );
    }
    return { success, failed };
}

/**
 * Helper to sync trophies for all players in a season
 */
export async function syncSeasonTrophies(leagueId, seasonYear, sendLog) {
    // Find players who have stats in this league/season but NO trophy sync
    const sql = `
        SELECT DISTINCT p.player_id, p.api_id, p.name
        FROM V3_Player_Stats s
        JOIN V3_Players p ON s.player_id = p.player_id
        WHERE s.league_id = ? AND s.season_year = ?
        AND p.is_trophy_synced = 0
    `;
    const players = db.all(sql, [leagueId, seasonYear]);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        try {
            if (sendLog.emit && i % 10 === 0) {
                sendLog.emit({ type: 'progress', step: 'trophies', current: i + 1, total: players.length, label: `Syncing Trophies: ${p.name}` });
            }
            const response = await footballApi.getPlayerTrophies(p.api_id);
            const trophies = response.response || [];

            for (const t of trophies) {
                if (!t.season || t.season === 'NULL') continue;
                const trophySql = `
                    INSERT INTO V3_Trophies (player_id, league_name, country, season, place, trophy)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(player_id, trophy, season) DO NOTHING
                `;
                const trophyName = t.trophy || t.league;
                db.run(trophySql, [p.player_id, t.league, t.country, t.season, t.place, trophyName]);
            }

            db.run(
                "UPDATE V3_Players SET is_trophy_synced = 1, last_sync_trophies = CURRENT_TIMESTAMP WHERE player_id = ?",
                [p.player_id]
            );
            success++;
            await new Promise(r => setTimeout(r, 100));
        } catch (e) {
            failed++;
        }
    }

    if (success > 0 || players.length === 0) {
        db.run(
            "UPDATE V3_League_Seasons SET imported_trophies = 1, last_sync_trophies = CURRENT_TIMESTAMP WHERE league_id = ? AND season_year = ?",
            [leagueId, seasonYear]
        );
    }
    return { success, failed };
}
