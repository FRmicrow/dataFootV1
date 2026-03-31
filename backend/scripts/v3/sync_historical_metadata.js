/**
 * Historical Metadata Synchronization Tool (Phase 8)
 *
 * This script automates the generation and persistence of:
 *  1. V3_Standings: Derived from V3_Fixtures ('FT' status).
 *  2. V3_Player_Season_Stats: Aggregated from V3_Fixture_Player_Stats.
 *
 * Usage:
 *   node scripts/v3/sync_historical_metadata.js --league <id> --season <year> [--force]
 */

import 'dotenv/config';
import db from '../../src/config/database.js';
import StatsEngine from '../../src/services/v3/StatsEngine.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'sync_historical_metadata' });

function getArg(name) {
    const idx = process.argv.indexOf(name);
    return (idx !== -1 && idx < process.argv.length - 1) ? process.argv[idx + 1] : null;
}

async function run() {
    const leagueId = parseInt(getArg('--league'));
    const seasonYear = parseInt(getArg('--season'));

    if (!leagueId || !seasonYear) {
        console.error('Usage: node scripts/v3/sync_historical_metadata.js --league <id> --season <year>');
        process.exit(1);
    }

    try {
        await db.init();
        log.info({ leagueId, seasonYear }, '🚀 Starting Metadata Sync...');

        // ─────────────────────────────────────────────────────────────
        // 1. SYNC STANDINGS
        // ─────────────────────────────────────────────────────────────
        log.info('📊 Calculating Standings...');
        const standings = await StatsEngine.getDynamicStandings(leagueId, seasonYear);
        
        if (standings.length > 0) {
            for (const s of standings) {
                // Persistent Upsert to V3_Standings
                await db.run(`
                    INSERT INTO V3_Standings (
                        league_id, season_year, team_id, rank, points, goals_diff, 
                        played, win, draw, lose, goals_for, goals_against, form, group_name
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (league_id, season_year, team_id, group_name) DO UPDATE SET
                        rank = excluded.rank,
                        points = excluded.points,
                        goals_diff = excluded.goals_diff,
                        played = excluded.played,
                        win = excluded.win,
                        draw = excluded.draw,
                        lose = excluded.lose,
                        goals_for = excluded.goals_for,
                        goals_against = excluded.goals_against,
                        form = excluded.form,
                        update_date = CURRENT_TIMESTAMP
                `, [
                    leagueId, seasonYear, s.team_id, s.rank, s.points, s.goals_diff,
                    s.played, s.win, s.draw, s.lose, s.goals_for, s.goals_against, s.form, 'Regular Season'
                ]);
            }
            log.info({ teams: standings.length }, '✅ Standings persisted');
        }

        // ─────────────────────────────────────────────────────────────
        // 2. SYNC PLAYER SEASON STATS (INSIGHTS)
        // ─────────────────────────────────────────────────────────────
        log.info('⚽ Aggregating Player Insights...');
        
        // Sum basic stats from v3_fixture_player_stats for this season
        const playerStats = await db.all(`
            SELECT 
                player_id, team_id,
                COUNT(*) as appearances,
                SUM(minutes_played) as minutes_played,
                SUM(goals_total) as goals_total,
                SUM(goals_assists) as goals_assists,
                SUM(goals_conceded) as goals_conceded
            FROM V3_Fixture_Player_Stats fps
            JOIN V3_Fixtures f ON fps.fixture_id = f.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
            GROUP BY player_id, team_id
        `, [leagueId, seasonYear]);

        if (playerStats.length > 0) {
            for (const p of playerStats) {
                // Calculate Per 90 metrics
                const min = p.minutes_played || 0;
                const g90 = min > 45 ? (p.goals_total * 90 / min).toFixed(2) : 0;
                const a90 = min > 45 ? (p.goals_assists * 90 / min).toFixed(2) : 0;

                await db.run(`
                    INSERT INTO V3_Player_Season_Stats (
                        player_id, team_id, league_id, season_year, 
                        appearances, minutes_played, goals_total, goals_assists, goals_conceded,
                        goals_per_90, assists_per_90
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (player_id, team_id, league_id, season_year) DO UPDATE SET
                        appearances = excluded.appearances,
                        minutes_played = excluded.minutes_played,
                        goals_total = excluded.goals_total,
                        goals_assists = excluded.goals_assists,
                        goals_conceded = excluded.goals_conceded,
                        goals_per_90 = excluded.goals_per_90,
                        assists_per_90 = excluded.assists_per_90,
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    p.player_id, p.team_id, leagueId, seasonYear,
                    p.appearances, p.minutes_played, p.goals_total, p.goals_assists, p.goals_conceded,
                    g90, a90
                ]);
            }
            log.info({ players: playerStats.length }, '✅ Player insights persisted');
        }

        log.info('🏆 Metadata Sync Complete');
        process.exit(0);

    } catch (e) {
        log.error({ err: e.message }, '❌ Sync failed');
        process.exit(1);
    }
}

run();
