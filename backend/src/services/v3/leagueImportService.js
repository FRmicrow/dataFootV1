import db from '../../config/database.js';
import footballApi from '../footballApi.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { Mappers, ImportRepository as DB } from './ImportService.js';
import { syncLeagueEventsService } from './fixtureService.js';
import { CompetitionRanker } from '../../utils/v3/CompetitionRanker.js';
import * as ImportControl from './importControlService.js';
import { syncAllV3Sequences } from '../../utils/v3/dbMaintenance.js';

// --- Private Helpers for Import Job ---

/**
 * Resolves league and season information, creating or updating records as needed.
 */
const resolveLeagueAndSeason = async (leagueId, seasonYear, sendLog, forceApiId) => {
    let targetApiId = leagueId;
    if (!forceApiId) {
        const localCheck = await db.get("SELECT api_id FROM V3_Leagues WHERE league_id = ?", cleanParams([leagueId]));
        if (localCheck?.api_id) targetApiId = localCheck.api_id;
    }

    const leagueResponse = await footballApi.getLeagues({ id: targetApiId, season: seasonYear });
    if (!leagueResponse.response?.length) {
        throw new Error(`League ID ${targetApiId} / Season ${seasonYear} not found in API.`);
    }
    const apiData = leagueResponse.response[0];
    const countryId = await DB.getOrInsertCountry(Mappers.country(apiData.country));

    const importanceRank = CompetitionRanker.calculate({
        name: apiData.league.name,
        type: apiData.league.type,
        country_name: apiData.country.name
    });

    let localLeague = await db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([targetApiId]));
    let localLeagueId;

    if (!localLeague) {
        const info = await db.run("INSERT INTO V3_Leagues (api_id, name, type, logo_url, country_id, importance_rank) VALUES (?,?,?,?,?,?)",
            cleanParams([apiData.league.id, apiData.league.name, apiData.league.type, apiData.league.logo, countryId, importanceRank]));
        localLeagueId = info.lastInsertRowid;
        sendLog(`✅ Created League: ${apiData.league.name}`, 'success');
    } else {
        localLeagueId = localLeague.league_id;
        await db.run("UPDATE V3_Leagues SET name=?, logo_url=?, type=?, importance_rank=? WHERE league_id=?",
            cleanParams([apiData.league.name, apiData.league.logo, apiData.league.type, importanceRank, localLeagueId]));
    }

    const apiSeason = apiData.seasons[0];
    let season = await db.get("SELECT * FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
    if (!season) {
        await db.run(`INSERT INTO V3_League_Seasons (
                league_id, season_year, start_date, end_date, is_current, 
                coverage_standings, coverage_players, coverage_top_scorers, coverage_top_assists, coverage_top_cards, coverage_injuries, coverage_predictions, coverage_odds
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            cleanParams([localLeagueId, seasonYear, apiSeason.start, apiSeason.end, apiSeason.current === true,
                apiSeason.coverage.standings === true, apiSeason.coverage.players === true, apiSeason.coverage.top_scorers === true, apiSeason.coverage.top_assists === true,
                apiSeason.coverage.top_cards === true, apiSeason.coverage.injuries === true, apiSeason.coverage.predictions === true, apiSeason.coverage.odds === true]));
        season = await db.get("SELECT * FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
    }

    return { localLeagueId, targetApiId, season };
};

/**
 * Imports all teams and venues for a given league and season.
 */
const importTeamsAndVenues = async (targetApiId, seasonYear, sendLog) => {
    const teamsResponse = await footballApi.getTeamsByLeague(targetApiId, seasonYear);
    const teams = teamsResponse.response;
    sendLog(`ℹ️ Found ${teams.length} teams. Importing...`, 'info');

    const localTeamMap = {};
    await db.run('BEGIN TRANSACTION');
    try {
        for (let i = 0; i < teams.length; i++) {
            const t = teams[i];
            await ImportControl.checkAbortOrPause(sendLog);
            if (sendLog.emit) {
                sendLog.emit({ type: 'progress', step: 'teams', current: i + 1, total: teams.length, label: `Importing ${t.team.name}` });
            }
            let venueId = t.venue?.id ? await DB.getOrInsertVenue(Mappers.venue(t.venue)) : null;
            localTeamMap[t.team.id] = await DB.upsertTeam(Mappers.team(t.team), venueId);
        }
        await db.run('COMMIT');
        return { teams, localTeamMap };
    } catch (err) {
        await db.run('ROLLBACK');
        throw err;
    }
};

/**
 * Imports players and their statistics for a set of teams.
 */
const importPlayersAndStats = async (teams, seasonYear, targetApiId, localLeagueId, localTeamMap, sendLog) => {
    const CHUNK_SIZE = 5;
    let totalPlayers = 0;

    for (let i = 0; i < teams.length; i += CHUNK_SIZE) {
        const chunk = teams.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (t) => {
            const teamApiId = t.team.id;
            let page = 1;
            let totalPages = 1;

            while (page <= totalPages) {
                try {
                    const playersRes = await footballApi.getPlayersByTeam(teamApiId, seasonYear, page);
                    if (!playersRes.response?.length) break;
                    totalPages = playersRes.paging.total;

                    await db.run('BEGIN TRANSACTION');
                    for (const p of playersRes.response) {
                        const localPlayerId = await DB.upsertPlayer(Mappers.player(p.player));
                        const leagueStats = p.statistics.filter(s => s.league.id === targetApiId);
                        for (const s of leagueStats) {
                            let statTeamId = localTeamMap[s.team.id] || (await db.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([s.team.id])))?.team_id;
                            if (localPlayerId && statTeamId) {
                                await DB.upsertPlayerStats(Mappers.stats(s, localPlayerId, statTeamId, localLeagueId, seasonYear));
                            }
                        }
                        totalPlayers++;
                    }
                    await db.run('COMMIT');
                } catch (err) {
                    try { await db.run('ROLLBACK'); } catch (e) { }
                    sendLog(`      ⚠️ Error fetching players for ${t.team.name}: ${err.message}`, 'error');
                }
                page++;
            }
        }));
        if (sendLog.emit) {
            const current = Math.min(i + CHUNK_SIZE, teams.length);
            sendLog.emit({ type: 'progress', step: 'players', current, total: teams.length, label: `Processed ${current}/${teams.length} teams` });
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    return totalPlayers;
};

/**
 * V3 Import Logic Service
 */
export const runImportJob = async (leagueId, seasonYear, sendLog, options = {}) => {
    const { forceApiId = false, forceRefresh = false } = options;
    sendLog(`🚀 V3 Import Started for League ID ${leagueId}, Season ${seasonYear}`, 'info');

    await syncAllV3Sequences((msg) => sendLog(msg, 'info'));
    const { localLeagueId, targetApiId, season } = await resolveLeagueAndSeason(leagueId, seasonYear, sendLog, forceApiId);

    if (!forceRefresh && season.imported_standings && season.imported_fixtures && season.imported_players) {
        sendLog(`⏩ Data already fully imported for ${seasonYear}.`, 'info');
        return { leagueId: targetApiId, season: seasonYear, skipped: true };
    }

    const { teams, localTeamMap } = await importTeamsAndVenues(targetApiId, seasonYear, sendLog);
    const totalPlayers = await importPlayersAndStats(teams, seasonYear, targetApiId, localLeagueId, localTeamMap, sendLog);

    await db.run("UPDATE V3_League_Seasons SET imported_players = true, last_imported_at = CURRENT_TIMESTAMP, last_sync_core = CURRENT_TIMESTAMP WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
    sendLog(`Processed ${totalPlayers} players.`, 'success');

    // Standings
    try {
        const standingsRes = await footballApi.getStandings(targetApiId, seasonYear);
        if (standingsRes.response?.[0]?.league?.standings) {
            await db.run('BEGIN TRANSACTION');
            for (const group of standingsRes.response[0].league.standings) {
                for (const row of group) {
                    let teamId = localTeamMap[row.team.id] || (await db.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([row.team.id])))?.team_id;
                    if (teamId) await DB.upsertStanding(Mappers.standings(row, localLeagueId, teamId, seasonYear));
                }
            }
            await db.run('COMMIT');
            await db.run("UPDATE V3_League_Seasons SET imported_standings = true WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
        }
    } catch (err) { sendLog(`⚠️ Standings import failed: ${err.message}`, 'error'); }

    // Fixtures & Promotion
    try {
        const fixturesRes = await footballApi.getFixtures(targetApiId, seasonYear);
        if (fixturesRes.response?.length) {
            await db.run('BEGIN TRANSACTION');
            for (const f of fixturesRes.response) {
                let hId = localTeamMap[f.teams.home.id] || (await db.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([f.teams.home.id])))?.team_id;
                let aId = localTeamMap[f.teams.away.id] || (await db.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([f.teams.away.id])))?.team_id;
                const venueId = f.fixture.venue.id ? await DB.getOrInsertVenue(Mappers.venue(f.fixture.venue)) : null;
                if (hId && aId) await DB.upsertFixture(Mappers.fixture(f, localLeagueId, venueId, hId, aId, seasonYear));
            }
            await db.run('COMMIT');
            await db.run("UPDATE V3_League_Seasons SET imported_fixtures = true, sync_status = 'FULL' WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
        }
    } catch (err) { sendLog(`⚠️ Fixtures import failed: ${err.message}`, 'error'); }

    const disc = await db.get("SELECT is_discovered FROM V3_Leagues WHERE league_id = ?", cleanParams([localLeagueId]));
    if (disc?.is_discovered) await db.run("UPDATE V3_Leagues SET is_discovered = false WHERE league_id = ?", cleanParams([localLeagueId]));

    try { await syncLeagueEventsService(localLeagueId, seasonYear, 2000); } catch (e) { }

    return { leagueId: targetApiId, season: seasonYear };
};

// --- Player Career Sync ---

export const syncPlayerCareerService = async (playerId, sendLog) => {
    const player = await db.get("SELECT api_id, name FROM V3_Players WHERE player_id = ?", cleanParams([playerId]));
    if (!player) throw new Error("Player not found.");

    sendLog(`🔭 Starting Deep-Career Sync for ${player.name}...`, 'info');

    const seasonsRes = await footballApi.getSeasons(player.api_id);
    if (!seasonsRes.response?.length) return { discovered: 0 };

    const yearsToProcess = seasonsRes.response.sort((a, b) => b - a);
    if (sendLog.emit) sendLog.emit({ type: 'scouting', total: yearsToProcess.length, years: yearsToProcess });

    let discoveredCount = 0;
    for (let i = 0; i < yearsToProcess.length; i++) {
        const year = yearsToProcess[i];
        await ImportControl.checkAbortOrPause(sendLog);
        if (sendLog.emit) sendLog.emit({ type: 'fetching', year, current: i + 1, total: yearsToProcess.length });

        try {
            const statsRes = await footballApi.getPlayerStatistics(player.api_id, year);
            if (!statsRes.response?.length) continue;

            await db.run('BEGIN TRANSACTION');
            for (const item of statsRes.response) {
                for (const stat of (item.statistics || [])) {
                    const countryName = stat.league.country || 'World';
                    const countryId = await DB.getOrInsertCountry(Mappers.country({ name: countryName, code: null, flag: stat.league.flag }));
                    const preLeague = await db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([stat.league.id]));
                    const localLeagueId = await DB.upsertLeague(Mappers.league(stat), countryId, countryName);
                    if (!preLeague) {
                        discoveredCount++;
                        sendLog(`✨ discovered: ${stat.league.name}`, 'info');
                    }
                    const localTeamId = await DB.upsertTeam(Mappers.team(stat.team), null);
                    const seasonId = await DB.upsertLeagueSeason(Mappers.leagueSeason(localLeagueId, year));

                    const mapped = Mappers.stats(stat, playerId, localTeamId, localLeagueId, year);
                    await DB.upsertPlayerStats(mapped);
                    await db.run("UPDATE V3_League_Seasons SET sync_status = 'PARTIAL' WHERE league_season_id = ? AND sync_status = 'NONE'", cleanParams([seasonId]));
                }
            }
            await db.run('COMMIT');
        } catch (err) {
            try { await db.run('ROLLBACK'); } catch (e) { }
            sendLog(`   ❌ Error Year ${year}: ${err.message}`, 'error');
        }
    }
    return { discovered: discoveredCount, years: yearsToProcess };
};
