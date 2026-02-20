import db from '../../config/database.js';
import footballApi from '../../services/footballApi.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { runImportJob, syncPlayerCareerService } from '../../services/v3/leagueImportService.js';

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
    sendLog.emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

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
    sendLog.emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const { selection } = req.body;
    // Input validation handled by middleware

    try {
        sendLog(`📦 Batch Import Started: ${selection.length} items queued.`, 'info');

        for (const item of selection) {
            const { leagueId, seasons, forceApiId = true } = item;

            // Loop through each season for this league
            for (const season of seasons) {
                try {
                    await runImportJob(leagueId, parseInt(season), sendLog, forceApiId);
                } catch (err) {
                    console.error(`Error in batch for League ${leagueId} Season ${season}:`, err);
                    sendLog(`❌ Error importing League ${leagueId} Season ${season}: ${err.message || String(err)}`, 'error');
                }
            }
        }

        sendLog('🎉 Batch Import Sequence Completed.', 'complete');
        // Send a complete event with dummy data so frontend knows it's done
        res.write(`data: ${JSON.stringify({ type: 'complete', leagueId: 0, season: 0 })}\n\n`);
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
    sendLog.emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const { id: playerId } = req.params;

    try {
        const result = await syncPlayerCareerService(playerId, sendLog);

        const summary = {
            type: 'complete',
            discovered: result.discovered
        };

        sendLog(`🎉 Deep-Career Reconciliation Completed.`, 'complete');
        if (result.discovered > 0) {
            sendLog(`🕵️ Discovery Archive: Added ${result.discovered} new competitions to library.`, 'warning');
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
