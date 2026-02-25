import db from '../../config/database.js';
import footballApi from '../footballApi.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { Mappers, ImportRepository as DB } from './ImportService.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Service to handle tactical statistics (Team Fixture Stats and Player Fixture Stats)
 */

/**
 * Sync fixture statistics for a league/season
 */
export const syncLeagueFixtureStatsService = async (leagueId, seasonYear, limit = 50, sendLog = null) => {
    const log = (msg, type = 'info') => {
        console.log(msg);
        if (sendLog && typeof sendLog === 'function') sendLog(msg, type);
    };

    log(`📡 Service: Syncing Tactical Fixture Stats for League ${leagueId}/${seasonYear}...`);

    try {
        const sql = `
            SELECT f.fixture_id, f.api_id
            FROM V3_Fixtures f
            LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Stats) fs ON f.fixture_id = fs.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
            AND f.status_short IN ('FT', 'AET', 'PEN')
            AND fs.fixture_id IS NULL
            LIMIT ?
        `;
        const targetFixtures = db.all(sql, [leagueId, seasonYear, limit]);

        if (targetFixtures.length === 0) {
            log('   ✅ No missing fixture stats found.', 'success');
            return { total: 0, success: 0, failed: 0 };
        }

        log(`   Found ${targetFixtures.length} fixtures missing tactical stats.`);
        let success = 0;
        let failed = 0;

        for (let i = 0; i < targetFixtures.length; i++) {
            const fixture = targetFixtures[i];
            if (sendLog && sendLog.emit) {
                sendLog.emit({
                    type: 'progress',
                    step: 'fixture_stats',
                    current: i + 1,
                    total: targetFixtures.length,
                    label: `Syncing FS: ${i + 1}/${targetFixtures.length}`
                });
            }

            try {
                await fetchAndStoreFixtureStats(fixture.fixture_id, fixture.api_id);
                success++;
            } catch (err) {
                console.error(`   ❌ Failed fixture ${fixture.fixture_id}: ${err.message}`);
                failed++;
            }
            // Minimal delay
            await delay(50);
        }

        if (success > 0) {
            db.run(
                "UPDATE V3_League_Seasons SET imported_fixture_stats = 1, last_sync_fixture_stats = CURRENT_TIMESTAMP WHERE league_id = ? AND season_year = ?",
                [leagueId, seasonYear]
            );
        }

        return { total: targetFixtures.length, success, failed };
    } catch (error) {
        console.error('Service Error in syncLeagueFixtureStatsService:', error);
        throw error;
    }
};

/**
 * Sync player match statistics for a league/season
 */
export const syncLeaguePlayerStatsService = async (leagueId, seasonYear, limit = 50, sendLog = null) => {
    const log = (msg, type = 'info') => {
        console.log(msg);
        if (sendLog && typeof sendLog === 'function') sendLog(msg, type);
    };

    log(`📡 Service: Syncing Tactical Player match stats for League ${leagueId}/${seasonYear}...`);

    try {
        const sql = `
            SELECT f.fixture_id, f.api_id
            FROM V3_Fixtures f
            LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Player_Stats) fps ON f.fixture_id = fps.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
            AND f.status_short IN ('FT', 'AET', 'PEN')
            AND fps.fixture_id IS NULL
            LIMIT ?
        `;
        const targetFixtures = db.all(sql, [leagueId, seasonYear, limit]);

        if (targetFixtures.length === 0) {
            log('   ✅ No missing player match stats found.', 'success');
            return { total: 0, success: 0, failed: 0 };
        }

        log(`   Found ${targetFixtures.length} fixtures missing player stats.`);
        let success = 0;
        let failed = 0;

        for (let i = 0; i < targetFixtures.length; i++) {
            const fixture = targetFixtures[i];
            if (sendLog && sendLog.emit) {
                sendLog.emit({
                    type: 'progress',
                    step: 'player_stats',
                    current: i + 1,
                    total: targetFixtures.length,
                    label: `Syncing PS: ${i + 1}/${targetFixtures.length}`
                });
            }

            try {
                await fetchAndStorePlayerStats(fixture.fixture_id, fixture.api_id);
                success++;
            } catch (err) {
                console.error(`   ❌ Failed fixture ${fixture.fixture_id}: ${err.message}`);
                failed++;
            }
            await delay(50);
        }

        if (success > 0) {
            db.run(
                "UPDATE V3_League_Seasons SET imported_player_stats = 1, last_sync_player_stats = CURRENT_TIMESTAMP WHERE league_id = ? AND season_year = ?",
                [leagueId, seasonYear]
            );

            // Trigger normalization after importing player stats
            log('🔄 Triggering seasonal player normalization (Per-90 metrics)...');
            await computePlayerSeasonNormalization(leagueId, seasonYear);
            log('✅ Normalization complete.');
        }

        return { total: targetFixtures.length, success, failed };
    } catch (error) {
        console.error('Service Error in syncLeaguePlayerStatsService:', error);
        throw error;
    }
};

/**
 * Fetch and store team statistics (with half splits if available)
 */
export async function fetchAndStoreFixtureStats(localFixtureId, apiFixtureId) {
    // API Call with half=true
    const res = await footballApi.getFixtureStatistics(apiFixtureId, { half: true });

    if (!res.response || res.response.length === 0) {
        console.warn(`      No FS data for fixture ${apiFixtureId}`);
        return;
    }

    db.run('BEGIN TRANSACTION');
    try {
        for (const teamContainer of res.response) {
            const teamApiId = teamContainer.team.id;
            const localTeamId = db.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", [teamApiId])?.team_id;

            if (!localTeamId) {
                console.warn(`      Team API ID ${teamApiId} not found locally.`);
                continue;
            }

            const stats = teamContainer.statistics;
            // API-Football with half=true returns types like "Shots on Goal", "Shots on Goal - 1st Half", "Shots on Goal - 2nd Half"
            // We need to group them.
            const ftStats = stats.filter(s => !s.type.includes('Half'));
            const h1Stats = stats.filter(s => s.type.includes('1st Half') || s.type.includes('First Half'));
            const h2Stats = stats.filter(s => s.type.includes('2nd Half') || s.type.includes('Second Half'));

            if (ftStats.length > 0) {
                DB.upsertFixtureStats(Mappers.fixtureStats(localFixtureId, localTeamId, 'FT', ftStats));
            }
            if (h1Stats.length > 0) {
                DB.upsertFixtureStats(Mappers.fixtureStats(localFixtureId, localTeamId, '1H', h1Stats));
            }
            if (h2Stats.length > 0) {
                DB.upsertFixtureStats(Mappers.fixtureStats(localFixtureId, localTeamId, '2H', h2Stats));
            }
        }
        db.run('COMMIT');
    } catch (err) {
        try { db.run('ROLLBACK'); } catch (e) { }
        throw err;
    }
}

/**
 * Fetch and store granular player statistics
 */
export async function fetchAndStorePlayerStats(localFixtureId, apiFixtureId) {
    const res = await footballApi.getFixturePlayerStatistics(apiFixtureId);

    if (!res.response || res.response.length === 0) {
        console.warn(`      No PS data for fixture ${apiFixtureId}`);
        return;
    }

    db.run('BEGIN TRANSACTION');
    try {
        for (const teamContainer of res.response) {
            const teamApiId = teamContainer.team.id;
            const localTeamId = db.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", [teamApiId])?.team_id;

            if (!localTeamId) continue;

            for (const playerStats of teamContainer.players) {
                // Mappers handles resolving player_id from API ID internally or we do it here?
                // Mappers.fixturePlayerStats currently leaves s.player_id as API ID
                // DB.upsertFixturePlayerStats resolves it to local ID.
                DB.upsertFixturePlayerStats(Mappers.fixturePlayerStats(localFixtureId, localTeamId, playerStats));
            }
        }
        db.run('COMMIT');
    } catch (err) {
        try { db.run('ROLLBACK'); } catch (e) { }
        throw err;
    }
}

/**
 * US_233: Analytical layer for seasonal normalization
 */
export async function computePlayerSeasonNormalization(leagueId, seasonYear) {
    try {
        // 1. Get all players who played in this league/season
        const players = db.all(`
            SELECT DISTINCT player_id, team_id
            FROM V3_Fixture_Player_Stats
            WHERE fixture_id IN (SELECT fixture_id FROM V3_Fixtures WHERE league_id = ? AND season_year = ?)
        `, [leagueId, seasonYear]);

        if (players.length === 0) return;

        db.run('BEGIN TRANSACTION');
        for (const p of players) {
            // 2. Sum stats
            const sums = db.get(`
                SELECT 
                    COUNT(*) as appearances,
                    SUM(minutes_played) as total_minutes,
                    SUM(goals_total) as goals,
                    SUM(goals_conceded) as conceded,
                    SUM(goals_assists) as assists,
                    SUM(shots_total) as shots,
                    SUM(shots_on) as shots_on,
                    SUM(passes_total) as passes,
                    SUM(passes_key) as key_passes,
                    SUM(tackles_total) as tackles,
                    SUM(tackles_interceptions) as interceptions,
                    SUM(duels_won) as duels_won,
                    SUM(dribbles_success) as dribbles_success
                FROM V3_Fixture_Player_Stats
                WHERE player_id = ? AND team_id = ? 
                AND fixture_id IN (SELECT fixture_id FROM V3_Fixtures WHERE league_id = ? AND season_year = ?)
            `, [p.player_id, p.team_id, leagueId, seasonYear]);

            if (!sums || !sums.total_minutes) continue;

            const mins = sums.total_minutes || 1; // Prevent div by zero
            const factor = 90 / mins;

            // 3. Upsert into V3_Player_Season_Stats
            db.run(`
                INSERT INTO V3_Player_Season_Stats (
                    player_id, team_id, league_id, season_year,
                    appearances, minutes_played, goals_total, goals_conceded, goals_assists,
                    goals_per_90, assists_per_90, shots_per_90, shots_on_target_per_90,
                    passes_per_90, key_passes_per_90, tackles_per_90, interceptions_per_90,
                    duels_won_per_90, dribbles_success_per_90
                ) VALUES (?,?,?,?, ?,?,?,?,?, ?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(player_id, team_id, league_id, season_year) DO UPDATE SET
                    appearances=excluded.appearances,
                    minutes_played=excluded.minutes_played,
                    goals_total=excluded.goals_total,
                    goals_conceded=excluded.goals_conceded,
                    goals_assists=excluded.goals_assists,
                    goals_per_90=excluded.goals_per_90,
                    assists_per_90=excluded.assists_per_90,
                    shots_per_90=excluded.shots_per_90,
                    shots_on_target_per_90=excluded.shots_on_target_per_90,
                    passes_per_90=excluded.passes_per_90,
                    key_passes_per_90=excluded.key_passes_per_90,
                    tackles_per_90=excluded.tackles_per_90,
                    interceptions_per_90=excluded.interceptions_per_90,
                    duels_won_per_90=excluded.duels_won_per_90,
                    dribbles_success_per_90=excluded.dribbles_success_per_90,
                    updated_at=CURRENT_TIMESTAMP
            `, [
                p.player_id, p.team_id, leagueId, seasonYear,
                sums.appearances, sums.total_minutes, sums.goals, sums.conceded, sums.assists,
                sums.goals * factor, sums.assists * factor, sums.shots * factor, sums.shots_on * factor,
                sums.passes * factor, sums.key_passes * factor, sums.tackles * factor, sums.interceptions * factor,
                sums.duels_won * factor, sums.dribbles_success * factor
            ]);
        }
        db.run('COMMIT');
    } catch (err) {
        try { db.run('ROLLBACK'); } catch (e) { }
        console.error('Normalization Error:', err);
    }
}
