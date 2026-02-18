import db from '../../config/database.js';
import footballApi from '../../services/footballApi.js';
import { syncLeagueEventsService } from './fixtureController.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { Mappers, ImportRepository as DB } from '../../services/v3/ImportService.js';

/**
 * V3 POC - Real Data Import Logic
 * This controller handles mass data ingestion into the experimental V3 schema.
 * It uses sequential processing to respect API rate limits and provide real-time SSE feedback.
 */
// --- Core Import Function ---

export const runImportJob = async (leagueId, seasonYear, sendLog, forceApiId = false) => {
    sendLog(`🚀 V3 Import Started for League ID ${leagueId}, Season ${seasonYear}`, 'info');

    // 1. Resolve ID & Fetch League Info
    let targetApiId = leagueId;

    if (!forceApiId) {
        // Check if this is a local ID (e.g. from Discovered Panel)
        const localCheck = db.get("SELECT api_id FROM V3_Leagues WHERE league_id = ?", cleanParams([leagueId]));
        // Only resolve to local api_id if the input ID doesn't match the found api_id (avoid self-mapping efficiency)
        // actually self-mapping is fine.
        // The issue is collision.
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
    if (!leagueResponse.response?.length) throw new Error("League data not found in API.");
    const apiData = leagueResponse.response[0];

    // Country & League Resolution
    const countryId = DB.getOrInsertCountry(apiData.country);

    // Check if we already have this league by API ID (Primary Truth)
    let localLeague = db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([targetApiId]));
    let localLeagueId;

    if (!localLeague) {
        // Double Check: Did we pass in a Local ID that is missing its API_ID match? 
        // Just rely on targetApiId for creation.

        const info = db.run("INSERT INTO V3_Leagues (api_id, name, type, logo_url, country_id) VALUES (?,?,?,?,?)",
            cleanParams([apiData.league.id, apiData.league.name, apiData.league.type, apiData.league.logo, countryId]));
        localLeagueId = info.lastInsertRowid;
        sendLog(`✅ Created League: ${apiData.league.name}`, 'success');
    } else {
        localLeagueId = localLeague.league_id;
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
    }

    // 2. Fetch Teams
    const teamsResponse = await footballApi.getTeamsByLeague(targetApiId, seasonYear);
    const teams = teamsResponse.response;
    sendLog(`ℹ️ Found ${teams.length} teams. Importing...`, 'info');

    const localTeamMap = {};
    db.run('BEGIN TRANSACTION');
    try {
        for (const t of teams) {
            let venueId = t.venue?.id ? DB.getOrInsertVenue(Mappers.venue(t.venue)) : null;
            localTeamMap[t.team.id] = DB.upsertTeam(Mappers.team(t.team), venueId);
        }
        db.run('COMMIT');
        sendLog(`✅ Imported ${teams.length} Teams and Venues.`, 'success');
    } catch (err) {
        db.run('ROLLBACK');
        throw err;
    }

    // 3. Fetch Players & Stats
    sendLog('📡 Fetching Players & Stats (Team by Team)...', 'info');
    let totalPlayers = 0;

    for (const t of teams) {
        const teamName = t.team.name;
        const teamApiId = t.team.id;
        const localTeamId = localTeamMap[teamApiId];
        sendLog(`   Processing ${teamName}...`, 'info');

        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
            const playersRes = await footballApi.getPlayersByTeam(teamApiId, seasonYear, page);
            if (!playersRes.response?.length) break;
            totalPages = playersRes.paging.total;

            db.run('BEGIN TRANSACTION');
            try {
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
                db.run('ROLLBACK');
                sendLog(`      ⚠️ Error on page ${page} for ${teamName}: ${err.message}`, 'error');
            }
            page++;
        }
    }

    db.run("UPDATE V3_League_Seasons SET imported_players = 1, last_imported_at = CURRENT_TIMESTAMP WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
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

/**
 * GET /api/v3/league/:apiId/available-seasons
 * Fetches all seasons from API-Football and cross-references local DB
 */
export const getAvailableSeasons = async (req, res) => {
    try {
        const { apiId } = req.params;
        const numericApiId = parseInt(apiId);

        if (!numericApiId) {
            return res.status(400).json({ error: "Missing or invalid apiId" });
        }

        // 1. Fetch from API-Football (1 API call)
        const leagueResponse = await footballApi.getLeagues({ id: numericApiId });
        if (!leagueResponse.response?.length) {
            return res.status(404).json({ error: "League not found in API-Football" });
        }

        const apiData = leagueResponse.response[0];

        // 2. Get local league record (if exists)
        const localLeague = db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([numericApiId]));

        // 3. Cross-reference each season with local DB
        const seasons = (apiData.seasons || []).map(s => {
            let status = 'NOT_IMPORTED';

            if (localLeague) {
                const localSeason = db.get(
                    "SELECT sync_status, imported_players, imported_standings, imported_fixtures FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?",
                    cleanParams([localLeague.league_id, s.year])
                );

                if (localSeason) {
                    if (localSeason.imported_players && localSeason.imported_standings && localSeason.imported_fixtures) {
                        status = 'FULL';
                    } else if (localSeason.sync_status === 'PARTIAL_DISCOVERY' || localSeason.sync_status === 'PARTIAL') {
                        status = localSeason.sync_status;
                    } else if (localSeason.imported_players) {
                        status = 'PARTIAL';
                    }
                }
            }

            return {
                year: s.year,
                start: s.start,
                end: s.end,
                is_current: s.current,
                status
            };
        }).sort((a, b) => b.year - a.year);

        res.json({
            league: {
                api_id: apiData.league.id,
                name: apiData.league.name,
                type: apiData.league.type,
                logo: apiData.league.logo,
                country: apiData.country?.name || 'World'
            },
            seasons
        });
    } catch (error) {
        console.error("Error fetching available seasons:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/league/:id/standings?year=2023
 */
export const getStandingsV3 = async (req, res) => {
    try {
        const { id: leagueId } = req.params;
        const { year: seasonYear } = req.query;

        if (!leagueId || !seasonYear) {
            return res.status(400).json({ error: "Missing leagueId or year" });
        }

        const standings = db.all(`
            SELECT 
                s.*, t.name as team_name, t.logo_url as team_logo
            FROM V3_Standings s
            JOIN V3_Teams t ON s.team_id = t.team_id
            WHERE s.league_id = ? AND s.season_year = ?
            ORDER BY s.group_name ASC, s.rank ASC
        `, cleanParams([leagueId, seasonYear]));

        res.json(standings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/league/:id/fixtures?year=2023
 */
export const getFixturesV3 = async (req, res) => {
    try {
        const { id: leagueId } = req.params;
        const { year: seasonYear } = req.query;

        if (!leagueId || !seasonYear) {
            return res.status(400).json({ error: "Missing leagueId or year" });
        }

        const fixtures = db.all(`
            SELECT 
                f.*, 
                ht.name as home_team_name, ht.logo_url as home_team_logo,
                at.name as away_team_name, at.logo_url as away_team_logo,
                v.name as venue_name, v.city as venue_city
            FROM V3_Fixtures f
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            LEFT JOIN V3_Venues v ON f.venue_id = v.venue_id
            WHERE f.league_id = ? AND f.season_year = ?
            ORDER BY f.date ASC
        `, cleanParams([leagueId, seasonYear]));

        // Get unique rounds
        const rounds = Array.from(new Set(fixtures.map(f => f.round)));

        res.json({
            fixtures,
            rounds
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Controllers ---

/**
 * GET /api/v3/countries
 */
export const getCountriesV3 = async (req, res) => {
    try {
        // Use V3_Countries as the primary source for the full, ranked list
        const countries = db.all(`
            SELECT name, code, flag_url as flag
            FROM V3_Countries
            ORDER BY importance_rank ASC, name ASC
        `);

        if (countries && countries.length > 0) {
            return res.json(countries);
        }

        // Fallback: footballApi
        const response = await footballApi.getCountries();
        if (response.response && response.response.length > 0) {
            return res.json(response.response);
        }

        res.json([]);
    } catch (error) {
        console.error("Error in getCountriesV3:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/leagues
 */
export const getLeaguesV3 = async (req, res) => {
    try {
        const { country } = req.query;
        const params = country ? { country } : {};
        const response = await footballApi.getLeagues(params);
        res.json(response.response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/v3/import/league
 */
export const importLeagueV3 = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
        res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    };

    const { leagueId, season, forceApiId = true } = req.body;
    try {
        const meta = await runImportJob(leagueId, parseInt(season), sendLog, forceApiId);
        res.write(`data: ${JSON.stringify({ type: 'complete', ...meta })}\n\n`);
        res.end();
    } catch (error) {
        console.error("V3 Import Job Failed:", error);
        const msg = error.message || String(error) || "Unknown Error";
        sendLog(`❌ Critical Error: ${msg}`, 'error');
        res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`);
        res.end();
    }
};

/**
 * POST /api/v3/import/batch
 */
export const importBatchV3 = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
        res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    };

    const { selection } = req.body;
    if (!selection || !Array.isArray(selection)) {
        sendLog('❌ Invalid selection format.', 'error');
        res.end();
        return;
    }

    try {
        sendLog(`📦 Batch Import Started: ${selection.length} Leagues queued.`, 'info');
        let lastMeta = null;

        for (const item of selection) {
            const { leagueId, seasons, forceApiId = true } = item;
            for (const season of seasons) {
                try {
                    lastMeta = await runImportJob(leagueId, parseInt(season), sendLog, forceApiId);
                } catch (err) {
                    console.error(`Error in batch for League ${leagueId} Season ${season}:`, err);
                    sendLog(`❌ Error importing League ${leagueId} Season ${season}: ${err.message || String(err)}`, 'error');
                }
            }
        }

        sendLog('🎉 Batch Import Sequence Completed.', 'complete');
        res.write(`data: ${JSON.stringify({ type: 'complete', ...lastMeta })}\n\n`);
        res.end();
    } catch (error) {
        console.error("V3 Batch Import Fatal Error:", error);
        sendLog(`❌ Critical Batch Error: ${error.message || String(error)}`, 'error');
        res.end();
    }
};

/**
 * POST /api/v3/player/:id/sync-career (SSE)
 * Implementation of US-V3-BE-016: Deep Sync Reconciliation
 */
export const syncPlayerCareerV3 = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
        res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    };

    const { id: playerId } = req.params;

    try {
        // 1. Get Player API ID
        const player = db.get("SELECT api_id, name FROM V3_Players WHERE player_id = ?", [playerId]);
        if (!player) throw new Error("Player not found in local V3 database.");

        sendLog(`🔭 Starting Deep-Career Sync for ${player.name}...`, 'info');

        // 2. Fetch all supported seasons from API
        sendLog(`[1/3] Fetching available seasons from API-Football...`, 'info');
        const seasonsRes = await footballApi.getSeasons(player.api_id);
        if (!seasonsRes.response?.length) {
            sendLog(`⚠️ No career history found in API.`, 'warning');
            res.end();
            return;
        }

        const allSeasons = seasonsRes.response;
        sendLog(`   Found ${allSeasons.length} years of history.`, 'success');

        // 3. Reconciliation Selection: Process EVERY year found in API
        const yearsToProcess = allSeasons.sort((a, b) => b - a);

        res.write(`data: ${JSON.stringify({ type: 'scouting', total: allSeasons.length, years: yearsToProcess })}\n\n`);

        sendLog(`[2/3] Reconciliation Engine active. Preparing to inspect ${yearsToProcess.length} years...`, 'info');

        // US-V3-BE-019: Auto-Discovery Mode Enabled (No more unresolved set)
        let discoveredCount = 0;

        // 5. Recursive Entity Discovery & Reconciliation
        sendLog(`[3/3] Commencing Deep-Sync for: ${yearsToProcess.join(', ')}...`, 'info');

        let yearsProcessed = 0;
        for (const year of yearsToProcess) {
            yearsProcessed++;
            res.write(`data: ${JSON.stringify({ type: 'fetching', year, current: yearsProcessed, total: yearsToProcess.length })}\n\n`);

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
                        const countryName = stat.league.country || 'World';
                        const countryId = DB.getOrInsertCountry(Mappers.country({
                            name: countryName,
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

        const summary = {
            type: 'complete',
            discovered: discoveredCount
        };

        sendLog(`🎉 Deep-Career Reconciliation Completed for ${player.name}.`, 'complete');
        if (discoveredCount > 0) {
            sendLog(`🕵️ Discovery Archive: Added ${discoveredCount} new competitions to library.`, 'warning');
        }
        res.write(`data: ${JSON.stringify(summary)}\n\n`);
        res.end();

    } catch (error) {
        console.error("Deep Sync Failed:", error);
        sendLog(`❌ Critical Error: ${error.message}`, 'error');
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
};

