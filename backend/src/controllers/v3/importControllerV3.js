import db from '../../config/database.js';
import footballApi from '../../services/footballApi.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { runImportJob, syncPlayerCareerService } from '../../services/v3/leagueImportService.js';
import {
    syncLeagueFixtureStatsService,
    syncLeaguePlayerStatsService
} from '../../services/v3/tacticalStatsService.js';
import {
    syncSeasonLineups,
    syncSeasonTrophies
} from '../../services/v3/deepSyncService.js';
import { syncLeagueEventsService } from '../../services/v3/fixtureService.js';
import * as ImportControl from '../../services/v3/importControlService.js';
import { cleanInt } from '../../utils/v3Helpers.js';

// --- Private Helpers ---

const calculateTotalSubTasks = (selection) => {
    let total = 0;
    selection.forEach(item => {
        item.seasons.forEach(s => {
            const pillars = (typeof s === 'object' ? s.pillars : null) || ['core'];
            total += pillars.length;
        });
    });
    return total;
};

const processPillar = async (pillar, leagueId, year, sendLog, options) => {
    const numericYear = cleanInt(year);
    const { forceApiId, forceRefresh } = options;
    switch (pillar) {
        case 'core': await runImportJob(leagueId, numericYear, sendLog, { forceApiId, forceRefresh }); break;
        case 'events': await syncLeagueEventsService(leagueId, numericYear, 2000, sendLog); break;
        case 'lineups': await syncSeasonLineups(leagueId, numericYear, sendLog); break;
        case 'fs': await syncLeagueFixtureStatsService(leagueId, numericYear, 2000, sendLog); break;
        case 'ps': await syncLeaguePlayerStatsService(leagueId, numericYear, 2000, sendLog); break;
        case 'trophies': await syncSeasonTrophies(leagueId, numericYear, sendLog); break;
        default: sendLog(`⚠️ Unknown pillar: ${pillar}`, 'warning');
    }
};

const getSeasonStatus = async (localLeague, seasonYear) => {
    if (!localLeague) return 'NOT_IMPORTED';
    const localSeason = await db.get("SELECT sync_status, imported_players, imported_standings, imported_fixtures FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?", cleanParams([localLeague.league_id, seasonYear]));
    if (!localSeason) return 'NOT_IMPORTED';
    if (localSeason.imported_players && localSeason.imported_standings && localSeason.imported_fixtures) return 'FULL';
    return (localSeason.sync_status === 'PARTIAL_DISCOVERY' || localSeason.sync_status === 'PARTIAL') ? localSeason.sync_status : (localSeason.imported_players ? 'PARTIAL' : 'NOT_IMPORTED');
};

// --- Controllers ---

export const getAvailableSeasons = async (req, res) => {
    try {
        const { apiId } = req.params;
        const numericApiId = Number.parseInt(apiId);
        if (!numericApiId) return res.status(400).json({ error: "Missing/invalid apiId" });

        const leagueResponse = await footballApi.getLeagues({ id: numericApiId });
        if (!leagueResponse.response?.length) return res.status(404).json({ error: "Not found" });

        const apiData = leagueResponse.response[0];
        const localLeague = await db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([numericApiId]));
        const seasons = await Promise.all((apiData.seasons || []).map(async s => ({
            year: s.year, start: s.start, end: s.end, is_current: s.current, status: await getSeasonStatus(localLeague, s.year)
        })));

        res.json({ success: true, data: { league: { api_id: apiData.league.id, name: apiData.league.name, logo: apiData.league.logo }, seasons: seasons.sort((a, b) => b.year - a.year) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const getStandingsV3 = async (req, res) => {
    try {
        const { id, year } = { id: req.params.id || req.query.id, year: req.query.year || req.query.season };
        const standings = await db.all(`SELECT s.*, t.name as team_name, t.logo_url as team_logo FROM V3_Standings s JOIN V3_Teams t ON s.team_id = t.team_id WHERE s.league_id = ? AND s.season_year = ? ORDER BY s.group_name ASC, s.rank ASC`, cleanParams([id, year]));
        res.json({ success: true, data: standings });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const getFixturesV3 = async (req, res) => {
    try {
        const { id, year } = { id: req.params.id || req.query.id, year: req.query.year || req.query.season };
        const fixtures = await db.all(`SELECT f.fixture_id, f.league_id, f.season_year, f.date, f.round, f.status_short, f.goals_home, f.goals_away, f.xg_home, f.xg_away, ht.team_id as home_team_id, ht.name as home_team_name, ht.logo_url as home_team_logo, at.team_id as away_team_id, at.name as away_team_name, at.logo_url as away_team_logo FROM V3_Fixtures f JOIN V3_Teams ht ON f.home_team_id = ht.team_id JOIN V3_Teams at ON f.away_team_id = at.team_id WHERE f.league_id = ? AND f.season_year = ? ORDER BY f.date ASC`, cleanParams([id, year]));
        res.json({ success: true, data: { fixtures, rounds: Array.from(new Set(fixtures.map(f => f.round))) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const getCountriesV3 = async (req, res) => {
    try {
        const countries = await db.all(`SELECT name, code, flag_url as flag FROM V3_Countries ORDER BY importance_rank ASC, name ASC`);
        res.json({ success: true, data: countries });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const getLeaguesV3 = async (req, res) => {
    try {
        const response = await footballApi.getLeagues(req.query.country ? { country: req.query.country } : {});
        res.json({ success: true, data: response.response });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

export const importLeagueV3 = async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    const sendLog = (message, type = 'info') => res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    try {
        ImportControl.resetImportState();
        const meta = await runImportJob(req.body.leagueId, Number.parseInt(req.body.season), sendLog, { forceApiId: true });
        res.write(`data: ${JSON.stringify({ type: 'complete', ...meta })}\n\n`);
        res.end();
    } catch (error) { sendLog(`❌ Error: ${error.message}`, 'error'); res.end(); }
};

export const importBatchV3 = async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    const sendLog = (message, type = 'info') => res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    sendLog.emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
    try {
        ImportControl.resetImportState();
        const { selection } = req.body;
        const total = calculateTotalSubTasks(selection);
        let current = 0;
        for (const item of selection) {
            for (const s of item.seasons) {
                const year = typeof s === 'object' ? s.year : s;
                const pillars = (typeof s === 'object' ? s.pillars : null) || ['core'];
                for (const pillar of pillars) {
                    current++;
                    sendLog.emit({ type: 'progress', step: 'overall', current, total, label: `Pillar ${pillar.toUpperCase()} - ${year}` });
                    await processPillar(pillar, item.leagueId, year, sendLog, { forceApiId: false });
                }
            }
        }
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
        res.end();
    } catch (error) { sendLog(`❌ Error: ${error.message}`, 'error'); res.end(); }
};

export const syncPlayerCareerV3 = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    const sendLog = (message, type = 'info') => res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    try {
        const result = await syncPlayerCareerService(req.params.id, sendLog);
        res.write(`data: ${JSON.stringify({ type: 'complete', discovered: result.discovered })}\n\n`);
        res.end();
    } catch (error) { sendLog(`❌ Error: ${error.message}`, 'error'); res.end(); }
};

export default { getAvailableSeasons, getStandingsV3, getFixturesV3, getCountriesV3, getLeaguesV3, importLeagueV3, importBatchV3, syncPlayerCareerV3 };
