import db from '../../config/database.js';
import footballApi from '../footballApi.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { Mappers, ImportRepository as DB } from './ImportService.js';
import { syncLeagueEventsService } from './fixtureService.js';
import { CompetitionRanker } from '../../utils/v3/CompetitionRanker.js';
import * as ImportControl from './importControlService.js';

/**
 * V3 Import Logic Service
 * Orchestrates API calls, DB transactions, and data mapping for mass ingestion.
 */

// --- League Import Job ---

export const runImportJob = async (leagueId, seasonYear, sendLog, options = {}) => {
    const { forceApiId = false, forceRefresh = false } = options;
    sendLog(`🚀 V3 Import Started for League ID ${leagueId}, Season ${seasonYear}`, 'info');

    // 1. Resolve ID & Fetch League Info
    let targetApiId = leagueId;

    if (!forceApiId) {
        // Check if this is a local ID (e.g. from Discovered Panel)
        const localCheck = db.get("SELECT api_id FROM V3_Leagues WHERE league_id = ?", cleanParams([leagueId]));
        if (localCheck && localCheck.api_id) {
            targetApiId = localCheck.api_id;
            if (targetApiId !== leagueId) {
                sendLog(`   ℹ️ Resolved Local ID ${leagueId} -> API ID ${targetApiId}`, 'info');
            }
        }
    } else {
        sendLog(`   ℹ️ Treating ID ${leagueId} as Strict API ID.`, 'info');
    }

    const leagueResponse = await footballApi.getLeagues({ id: targetApiId, season: seasonYear });
    if (!leagueResponse.response?.length) {
        throw new Error(`League ID ${targetApiId} / Season ${seasonYear} not found in API. This season might not be supported for this league.`);
    }
    const apiData = leagueResponse.response[0];

    // Country & League Resolution
    const countryId = DB.getOrInsertCountry(Mappers.country(apiData.country));
    // Note: Mappers.country receives apiData.country { name, code, flag }

    // Check if we already have this league by API ID (Primary Truth)
    let localLeague = db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([targetApiId]));
    let localLeagueId;

    const importanceRank = CompetitionRanker.calculate({
        name: apiData.league.name,
        type: apiData.league.type,
        country_name: apiData.country.name
    });

    if (!localLeague) {
        const info = db.run("INSERT INTO V3_Leagues (api_id, name, type, logo_url, country_id, importance_rank) VALUES (?,?,?,?,?,?)",
            cleanParams([apiData.league.id, apiData.league.name, apiData.league.type, apiData.league.logo, countryId, importanceRank]));
        localLeagueId = info.lastInsertRowid;
        sendLog(`✅ Created League: ${apiData.league.name} (Rank: ${importanceRank})`, 'success');
    } else {
        localLeagueId = localLeague.league_id;
        // Integrity Sync: Refresh info even if exists
        db.run("UPDATE V3_Leagues SET name=?, logo_url=?, type=?, api_id=?, importance_rank=? WHERE league_id=?",
            cleanParams([apiData.league.name, apiData.league.logo, apiData.league.type, apiData.league.id, importanceRank, localLeagueId]));
    }

    // Season Tracker
    const apiSeason = apiData.seasons[0];
    let leagueSeason = db.get("SELECT * FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));

    if (!leagueSeason) {
        db.run(`INSERT INTO V3_League_Seasons (
                league_id, season_year, start_date, end_date, is_current, 
                coverage_standings, coverage_players, coverage_top_scorers, coverage_top_assists, coverage_top_cards, coverage_injuries, coverage_predictions, coverage_odds
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            cleanParams([localLeagueId, seasonYear, apiSeason.start, apiSeason.end, apiSeason.current ? 1 : 0,
                apiSeason.coverage.standings ? 1 : 0, apiSeason.coverage.players ? 1 : 0, apiSeason.coverage.top_scorers ? 1 : 0, apiSeason.coverage.top_assists ? 1 : 0,
                apiSeason.coverage.top_cards ? 1 : 0, apiSeason.coverage.injuries ? 1 : 0, apiSeason.coverage.predictions ? 1 : 0, apiSeason.coverage.odds ? 1 : 0]));
        sendLog(`📅 Created Season Tracker for ${seasonYear}`, 'success');
        leagueSeason = db.get("SELECT * FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
    }

    // Idempotency Check (US_041)
    if (!forceRefresh && leagueSeason.imported_standings && leagueSeason.imported_fixtures && leagueSeason.imported_players) {
        sendLog(`⏩ Data already fully imported for ${seasonYear}. Use Force Refresh to overwrite.`, 'info');
        return { leagueId: targetApiId, season: seasonYear, skipped: true };
    }

    // 2. Fetch Teams
    const teamsResponse = await footballApi.getTeamsByLeague(targetApiId, seasonYear);
    const teams = teamsResponse.response;
    sendLog(`ℹ️ Found ${teams.length} teams. Importing...`, 'info');

    const localTeamMap = {};
    db.run('BEGIN TRANSACTION');
    let currentTeam = 0;
    try {
        for (const t of teams) {
            await ImportControl.checkAbortOrPause(sendLog);
            currentTeam++;
            if (sendLog.emit) {
                sendLog.emit({ type: 'progress', step: 'teams', current: currentTeam, total: teams.length, label: `Importing ${t.team.name}` });
            }
            let venueId = t.venue?.id ? DB.getOrInsertVenue(Mappers.venue(t.venue)) : null;
            localTeamMap[t.team.id] = DB.upsertTeam(Mappers.team(t.team), venueId);
        }
        db.run('COMMIT');
        sendLog(`✅ Imported ${teams.length} Teams and Venues.`, 'success');
    } catch (err) {
        db.run('ROLLBACK');
        throw err;
    }

    // 3. Fetch Players & Stats (Optimized for high-throughput)
    sendLog('📡 Fetching Players & Stats (Parallel Chunks)...', 'info');
    let totalPlayers = 0;
    const TEAM_CHUNK_SIZE = 5;

    for (let i = 0; i < teams.length; i += TEAM_CHUNK_SIZE) {
        const chunk = teams.slice(i, i + TEAM_CHUNK_SIZE);

        await Promise.all(chunk.map(async (t) => {
            await ImportControl.checkAbortOrPause(sendLog);
            const teamName = t.team.name;
            const teamApiId = t.team.id;

            let page = 1;
            let totalPages = 1;

            while (page <= totalPages) {
                try {
                    const playersRes = await footballApi.getPlayersByTeam(teamApiId, seasonYear, page);
                    if (!playersRes.response?.length) break;
                    totalPages = playersRes.paging.total;

                    db.run('BEGIN TRANSACTION');
                    for (const p of playersRes.response) {
                        const localPlayerId = DB.upsertPlayer(Mappers.player(p.player));
                        const leagueStats = p.statistics.filter(s => s.league.id === targetApiId);
                        for (const s of leagueStats) {
                            let statTeamId = localTeamMap[s.team.id] || db.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([s.team.id]))?.team_id;
                            if (localPlayerId && statTeamId) {
                                DB.upsertPlayerStats(Mappers.stats(s, localPlayerId, statTeamId, localLeagueId, seasonYear));
                            }
                        }
                        totalPlayers++;
                    }
                    db.run('COMMIT');
                } catch (err) {
                    try { db.run('ROLLBACK'); } catch (e) { }
                    sendLog(`      ⚠️ Error fetching players for ${teamName} (Page ${page}): ${err.message}`, 'error');
                }
                page++;
            }
        }));

        if (sendLog.emit) {
            const currentProgress = Math.min(i + TEAM_CHUNK_SIZE, teams.length);
            sendLog.emit({ type: 'progress', step: 'players', current: currentProgress, total: teams.length, label: `Processed ${currentProgress}/${teams.length} teams` });
        }

        // Aggressive delay: 5 teams (~10-15 calls) every 1.5s
        await new Promise(r => setTimeout(r, 1500));
    }

    db.run("UPDATE V3_League_Seasons SET imported_players = 1, last_imported_at = CURRENT_TIMESTAMP, last_sync_core = CURRENT_TIMESTAMP WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
    sendLog(`🎉 League ${targetApiId} (${seasonYear}) Complete! Processed ${totalPlayers} players.`, 'success');

    // 4. Ingest Standings
    sendLog('📊 Fetching Standings...', 'info');
    try {
        const standingsRes = await footballApi.getStandings(targetApiId, seasonYear);
        if (standingsRes.response && standingsRes.response.length > 0) {
            const leagueData = standingsRes.response[0].league;
            db.run('BEGIN TRANSACTION');
            for (const group of leagueData.standings) {
                for (const row of group) {
                    const teamApiId = row.team.id;
                    const teamId = localTeamMap[teamApiId] || db.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([teamApiId]))?.team_id;
                    if (teamId) {
                        DB.upsertStanding(Mappers.standings(row, localLeagueId, teamId, seasonYear));
                    }
                }
            }
            db.run('COMMIT');
            db.run("UPDATE V3_League_Seasons SET imported_standings = 1 WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
            sendLog(`✅ Standings imported.`, 'success');
        } else {
            sendLog(`ℹ️ No standings found for this league.`, 'info');
        }
    } catch (err) {
        sendLog(`⚠️ Standings import failed: ${err.message}`, 'error');
    }

    // 5. Ingest Fixtures
    sendLog('🏟️ Fetching Fixtures...', 'info');
    try {
        const fixturesRes = await footballApi.getFixtures(targetApiId, seasonYear);
        if (fixturesRes.response && fixturesRes.response.length > 0) {
            db.run('BEGIN TRANSACTION');
            for (const f of fixturesRes.response) {
                const homeTeamId = localTeamMap[f.teams.home.id] || db.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([f.teams.home.id]))?.team_id;
                const awayTeamId = localTeamMap[f.teams.away.id] || db.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([f.teams.away.id]))?.team_id;
                const venueId = f.fixture.venue.id ? DB.getOrInsertVenue(Mappers.venue(f.fixture.venue)) : null;

                if (homeTeamId && awayTeamId) {
                    DB.upsertFixture(Mappers.fixture(f, localLeagueId, venueId, homeTeamId, awayTeamId, seasonYear));
                }
            }
            db.run('COMMIT');
            db.run("UPDATE V3_League_Seasons SET imported_fixtures = 1 WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
            sendLog(`✅ Fixtures imported.`, 'success');
        } else {
            sendLog(`ℹ️ No fixtures found for this league.`, 'info');
        }
    } catch (err) {
        sendLog(`⚠️ Fixtures import failed: ${err.message}`, 'error');
    }

    // 6. Post-Import: Promote discovered league to Official
    const discoveredCheck = db.get("SELECT is_discovered FROM V3_Leagues WHERE league_id = ?", cleanParams([localLeagueId]));
    if (discoveredCheck && discoveredCheck.is_discovered === 1) {
        db.run("UPDATE V3_Leagues SET is_discovered = 0 WHERE league_id = ?", cleanParams([localLeagueId]));
        sendLog(`🏅 League promoted to Official (is_discovered = 0).`, 'success');
    }

    // Mark season as FULL sync
    db.run("UPDATE V3_League_Seasons SET sync_status = 'FULL' WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));

    // 7. Auto-Sync Fixture Events (Catch-Up)
    try {
        sendLog('⚡ Syncing match events (Goals, Cards, Subs)...', 'info');
        // Use a high limit since we are in a batch job context
        const syncRes = await syncLeagueEventsService(localLeagueId, seasonYear, 2000);
        if (syncRes.success > 0) {
            sendLog(`✅ Synced events for ${syncRes.success} fixtures.`, 'success');
        } else {
            sendLog(`ℹ️ No new events found to sync.`, 'info');
        }
    } catch (evtErr) {
        sendLog(`⚠️ Event sync warning: ${evtErr.message}`, 'warning');
    }

    // Return metadata for frontend dashboard links
    return { leagueId: targetApiId, season: seasonYear };
};

// --- Player Career Sync ---

export const syncPlayerCareerService = async (playerId, sendLog) => {
    // 1. Get Player API ID
    const player = db.get("SELECT api_id, name FROM V3_Players WHERE player_id = ?", [playerId]);
    if (!player) throw new Error("Player not found in local V3 database.");

    sendLog(`🔭 Starting Deep-Career Sync for ${player.name}...`, 'info');

    // 2. Fetch all supported seasons from API
    sendLog(`[1/3] Fetching available seasons from API-Football...`, 'info');
    const seasonsRes = await footballApi.getSeasons(player.api_id);
    if (!seasonsRes.response?.length) {
        sendLog(`⚠️ No career history found in API.`, 'warning');
        return { discovered: 0 };
    }

    const allSeasons = seasonsRes.response;
    sendLog(`   Found ${allSeasons.length} years of history.`, 'success');

    // 3. Reconciliation Selection: Process EVERY year found in API
    const yearsToProcess = allSeasons.sort((a, b) => b - a);

    // Yield initial meta back to controller if needed (using sendLog/special callback?) 
    // For now we just return meta at end. If controller needs streaming array, we could pass a callback 'onMeta'.
    // Or we handle streaming in controller via sendLog wrapper. 
    // Wait, controller sends SSE for 'scouting' event. 
    // Let's assume sendLog can handle 'raw' types or we enhance it.
    // Actually, I'll just emit a special log entry or rely on return value? 
    // The controller logic had: res.write(JSON.stringify({ type: 'scouting' ... }))

    // Modification: sendLog usually sends {message, type}. 
    // The controller will need to adapt or I assume sendLog handles raw objects?
    // Let's stick to standard logging for service, and maybe return the years array ASAP?
    // Actually, sync is async. The controller can't wait for return. 
    // I'll emit a special event via sendLog:
    if (sendLog.emit) {
        sendLog.emit({ type: 'scouting', total: allSeasons.length, years: yearsToProcess });
    }

    sendLog(`[2/3] Reconciliation Engine active. Preparing to inspect ${yearsToProcess.length} years...`, 'info');

    // US-V3-BE-019: Auto-Discovery Mode Enabled (No more unresolved set)
    let discoveredCount = 0;

    // 5. Recursive Entity Discovery & Reconciliation
    sendLog(`[3/3] Commencing Deep-Sync for: ${yearsToProcess.join(', ')}...`, 'info');

    let yearsProcessed = 0;
    for (const year of yearsToProcess) {
        await ImportControl.checkAbortOrPause(sendLog);
        yearsProcessed++;
        if (sendLog.emit) {
            sendLog.emit({ type: 'fetching', year, current: yearsProcessed, total: yearsToProcess.length });
        }

        sendLog(`   Inspecting Year ${year}...`, 'info');
        const statsRes = await footballApi.getPlayerStatistics(player.api_id, year);

        if (!statsRes.response?.length) {
            sendLog(`   ⚠️ No statistics returned for ${year}. Skipping bundle.`, 'warning');
            continue;
        }

        db.run('BEGIN TRANSACTION');
        try {
            // API-Football returns response: [ { player: {}, statistics: [] } ]
            for (const item of statsRes.response) {
                for (const stat of (item.statistics || [])) {

                    // b. Resolve Dependencies (Idempotent with Auto-Discovery)
                    // Mappers.country expecting {name, code, flag}
                    const countryName = stat.league.country || 'World';
                    const countryId = DB.getOrInsertCountry(Mappers.country({
                        name: countryName,
                        code: null, // stat.league doesn't have code usually
                        flag: stat.league.flag
                    }));

                    // Check if league existed before upsert to log discovery
                    const preLeague = db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", [stat.league.id]);
                    const localLeagueId = DB.upsertLeague(Mappers.league(stat), countryId, countryName);

                    if (!preLeague) {
                        discoveredCount++;
                        sendLog(`      ✨ Discovered New Competition: ${stat.league.name}`, 'info');
                    }

                    const localTeamId = DB.upsertTeam(Mappers.team(stat.team), null);
                    const seasonId = DB.upsertLeagueSeason(Mappers.leagueSeason(localLeagueId, year));

                    // c. Reconciliation Check
                    const existingStat = db.get(`
                        SELECT stat_id, games_appearences, goals_total, goals_assists 
                        FROM V3_Player_Stats 
                        WHERE player_id=? AND team_id=? AND league_id=? AND season_year=?
                    `, [playerId, localTeamId, localLeagueId, year]);

                    const mapped = Mappers.stats(stat, playerId, localTeamId, localLeagueId, year);

                    if (existingStat) {
                        const isMismatch = (
                            existingStat.games_appearences !== mapped.games_appearences ||
                            existingStat.goals_total !== mapped.goals_total ||
                            existingStat.goals_assists !== mapped.goals_assists
                        );

                        if (isMismatch) {
                            DB.upsertPlayerStats(mapped);
                            sendLog(`      🔄 Overwritten: ${stat.league.name} - Data mismatch corrected.`, 'stat_updated');
                        }
                    } else {
                        DB.upsertPlayerStats(mapped);
                        sendLog(`      🆕 Backfilled: ${stat.league.name} - New competition found.`, 'stat_new');
                    }

                    // Ensure Partial status stays accurate
                    db.run(`
                        UPDATE V3_League_Seasons 
                        SET sync_status = 'PARTIAL' 
                        WHERE league_season_id = ? AND sync_status = 'NONE'
                    `, [seasonId]);
                }
            }
            db.run('COMMIT');
            sendLog(`   ✅ Year ${year} reconciliation complete.`, 'success');
        } catch (err) {
            db.run('ROLLBACK');
            sendLog(`   ❌ Error reconciling Year ${year}: ${err.message}`, 'error');
        }
    }

    return { discovered: discoveredCount, years: yearsToProcess };
};
