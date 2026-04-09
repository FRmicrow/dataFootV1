import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const DATA_ROOT = path.resolve(__dirname, '../../../xGData');
const COMPILED_DIR = path.join(DATA_ROOT, 'xG-PerYear-League-Player');
const MATCHES_DIR = path.join(DATA_ROOT, 'understat');

// Quick map for Understat league directories to V3_Leagues.api_id
const LEAGUE_MAP = {
    'Bundesliga': 78,
    'Liga': 140,
    'Ligue1': 61,
    'PL': 39,
    'SerieA': 135
};

// Common Team Name Corrections (Understat -> API-Football)
const TEAM_NAME_OVERRIDES = {
    'Manchester United': 'Manchester United',
    'Tottenham': 'Tottenham',
    'Bournemouth': 'Bournemouth',
    'Aston Villa': 'Aston Villa',
    'Everton': 'Everton',
    'Watford': 'Watford',
    'Leicester': 'Leicester',
    'Sunderland': 'Sunderland',
    'Norwich': 'Norwich',
    'Crystal Palace': 'Crystal Palace',
    'Chelsea': 'Chelsea',
    'Swansea': 'Swansea',
    'Newcastle United': 'Newcastle',
    'Southampton': 'Southampton',
    'Arsenal': 'Arsenal',
    'West Ham': 'West Ham',
    'Stoke': 'Stoke City',
    'Liverpool': 'Liverpool',
    'West Bromwich Albion': 'West Brom',
    'Manchester City': 'Manchester City',
    'Paris Saint Germain': 'Paris Saint Germain',
    'Saint-Etienne': 'Saint Etienne',
    'Lorient': 'Lorient',
    'Guingamp': 'Guingamp',
    'Rennes': 'Rennes',
    'Monaco': 'Monaco',
    'Nice': 'Nice',
    'Troyes': 'Troyes',
    'Ajaccio': 'Ajaccio',
    'Lyon': 'Lyon',
    'Bordeaux': 'Bordeaux',
    'Reims': 'Reims',
    'Marseille': 'Marseille',
    'Lille': 'Lille',
    'Montpellier': 'Montpellier',
    'Angers': 'Angers',
    'Bastia': 'Bastia',
    'Caen': 'Caen',
    'Toulouse': 'Toulouse',
    'Bayern Munich': 'Bayern Munich',
    'Borussia Dortmund': 'Borussia Dortmund',
    'Bayer Leverkusen': 'Bayer Leverkusen',
    'Borussia M.Gladbach': 'Borussia Monchengladbach',
    'Eintracht Frankfurt': 'Eintracht Frankfurt',
    'Real Madrid': 'Real Madrid',
    'Barcelona': 'Barcelona',
    'Atletico Madrid': 'Atletico Madrid',
    'Juventus': 'Juventus',
    'AC Milan': 'AC Milan',
    'Inter': 'Inter',
    'Roma': 'Roma',
    'Napoli': 'Napoli',
    'FC Cologne': '1. FC Köln',
    'Greuther Fuerth': 'SpVgg Greuther Fürth',
    'Wolverhampton Wanderers': 'Wolves',
    'Sheffield United': 'Sheffield Utd',
    'Bayern Munich': 'Bayern München',
    'Borussia M.Gladbach': 'Borussia Mönchengladbach',
    'RasenBallsport Leipzig': 'RB Leipzig',
    'Hertha Berlin': 'Hertha BSC',
    'Fortuna Duesseldorf': 'Fortuna Düsseldorf',
    'Nuernberg': '1. FC Nürnberg',
    'Saint-Etienne': 'Saint Etienne',
    'GFC Ajaccio': 'Gazelec FC Ajaccio',
    'Real Oviedo': 'Oviedo'
};

// Hardcoded date corrections for matches that were massively postponed in real life 
// but kept their original calendar date on Understat.
// Format Key: "LeagueID_UnderstatDate_Home_Away" -> "RealDBDate"
const DATE_OVERRIDES = {
    '61_2018-04-14_Caen_Toulouse': '2018-04-25',
    '135_2024-04-14_Udinese_Roma': '2024-04-25'
};

// Memory cache for team mappings
const teamCache = {}; // { 'leagueId_understatName': team_id }
let allV3Teams = [];
let leagueTeams = {}; // { leagueId: Set(team_ids) }

async function init() {
    await db.init();
    logger.info('🚀 Connected to API-Football V3 DB');
    allV3Teams = await db.all("SELECT team_id, name, country FROM V3_Teams");
    
    // Build a map of valid team IDs per league to avoid foreign clone teams (e.g., Arsenal Belarus)
    const fixtures = await db.all("SELECT DISTINCT league_id, home_team_id, away_team_id FROM V3_Fixtures");
    for (const f of fixtures) {
        if (!leagueTeams[f.league_id]) leagueTeams[f.league_id] = new Set();
        leagueTeams[f.league_id].add(f.home_team_id);
        leagueTeams[f.league_id].add(f.away_team_id);
    }
}

function findV3TeamId(understatName, leagueId) {
    const cacheKey = `${leagueId}_${understatName}`;
    if (teamCache[cacheKey]) return teamCache[cacheKey];

    // Try override
    let searchName = TEAM_NAME_OVERRIDES[understatName] || understatName;
    
    // Filter to teams that actually played in this league (from DB fixtures history)
    let validTeams = leagueId && leagueTeams[leagueId] ? 
        allV3Teams.filter(t => leagueTeams[leagueId].has(t.team_id)) : 
        [];
        
    // If not found in fixture history, use global lookup but prioritize exact names
    if (validTeams.length === 0) validTeams = allV3Teams;

    // 1. Try exact name match inside validTeams
    let match = validTeams.find(t => t.name.toLowerCase() === searchName.toLowerCase());
    
    // 2. Try exact name match globally if validTeams was restricted
    if (!match && validTeams !== allV3Teams) {
        match = allV3Teams.find(t => t.name.toLowerCase() === searchName.toLowerCase());
    }
    
    // 3. Try fuzzy/includes match inside validTeams (Safe, because they played in the league)
    if (!match && validTeams !== allV3Teams) {
        match = validTeams.find(t => 
            t.name.toLowerCase().includes(searchName.toLowerCase()) || 
            searchName.toLowerCase().includes(t.name.toLowerCase())
        );
    }

    if (match) {
        teamCache[cacheKey] = match.team_id;
        return match.team_id;
    }

    return null;
}

async function getLeagueIdByApiId(apiId) {
    const lg = await db.get("SELECT league_id FROM V3_Leagues WHERE api_id = $1", [apiId]);
    return lg ? lg.league_id : null;
}

// ---- 1. IMPORT COMPILED xG (Per Season) ----
async function importCompiledSeasons() {
    logger.info('📊 Starting Compiled xG Import (V3_League_Season_xG)');
    
    const dirs = await fs.readdir(COMPILED_DIR);
    for (const folder of dirs) {
        if (!LEAGUE_MAP[folder]) continue; // Skip unknown folders

        const apiId = LEAGUE_MAP[folder];
        const leagueId = await getLeagueIdByApiId(apiId);
        if (!leagueId) {
            logger.warn(`League ID not found for API ID ${apiId} (Folder: ${folder})`);
            continue;
        }

        const folderPath = path.join(COMPILED_DIR, folder);
        const files = await fs.readdir(folderPath);

        let importedRows = 0;
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            if (!file.includes('-chemp-')) continue; // Skip player stats

            const yearMatch = file.match(/(\d{4})-(\d{4})/);
            if (!yearMatch) continue;
            
            const seasonYear = parseInt(yearMatch[1], 10);
            const content = await fs.readFile(path.join(folderPath, file), 'utf-8');
            let seasonData;
            try {
                // Strip optional BOM
                seasonData = JSON.parse(content.replace(/^\uFEFF/, ''));
            } catch (e) {
                logger.error(`Failed to parse JSON: ${file} - ${e.message}`);
                continue;
            }

            for (const row of seasonData) {
                const understatTeamName = row.team;
                // Important: pass leagueId here so that findV3TeamId restricts matching to teams
                // that actually played in this specific league
                const teamId = findV3TeamId(understatTeamName, leagueId);

                if (!teamId) {
                    logger.warn(`[Season] Team not found in V3: ${understatTeamName} (${folder} ${seasonYear})`);
                    continue;
                }

                // Upsert to V3_League_Season_xG
                await db.run(`
                    INSERT INTO V3_League_Season_xG (
                        league_id, season_year, team_id,
                        xg_for, xg_against, xg_points,
                        np_xg, ppda, deep_completions,
                        goals_for, goals_against, actual_points,
                        matches, wins, draws, loses,
                        npxg_against, npxg_diff, ppda_allowed, deep_allowed,
                        raw_json
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                    ON CONFLICT (league_id, season_year, team_id) DO UPDATE SET
                        xg_for = EXCLUDED.xg_for,
                        xg_against = EXCLUDED.xg_against,
                        xg_points = EXCLUDED.xg_points,
                        np_xg = EXCLUDED.np_xg,
                        ppda = EXCLUDED.ppda,
                        deep_completions = EXCLUDED.deep_completions,
                        goals_for = EXCLUDED.goals_for,
                        goals_against = EXCLUDED.goals_against,
                        actual_points = EXCLUDED.actual_points,
                        matches = EXCLUDED.matches,
                        wins = EXCLUDED.wins,
                        draws = EXCLUDED.draws,
                        loses = EXCLUDED.loses,
                        npxg_against = EXCLUDED.npxg_against,
                        npxg_diff = EXCLUDED.npxg_diff,
                        ppda_allowed = EXCLUDED.ppda_allowed,
                        deep_allowed = EXCLUDED.deep_allowed,
                        raw_json = EXCLUDED.raw_json,
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    leagueId, seasonYear, teamId,
                    row.xG || null, row.xGA || null, row.xPTS || null,
                    row.NPxG || null, row.ppda || null, row.deep || null,
                    row.goals !== undefined ? row.goals : null,
                    row.ga !== undefined ? row.ga : null,
                    row.points !== undefined ? row.points : null,
                    row.matches !== undefined ? row.matches : null,
                    row.wins !== undefined ? row.wins : null,
                    row.draws !== undefined ? row.draws : null,
                    row.loses !== undefined ? row.loses : null,
                    row.NPxGA || null,
                    row.NPxGD || null,
                    row.ppda_allowed || null,
                    row.deep_allowed || null,
                    JSON.stringify(row)
                ]);
                importedRows++;
            }
        }
        logger.info(`✅ ${folder}: Imported ${importedRows} team-season rows.`);
    }
}

// ---- 2. IMPORT FIXTURE MATCH xG ----
async function importMatches() {
    logger.info('⚽ Starting Match xG Import (V3_Fixtures)');
    
    // Map of understat filenames to API IDs (using heuristics or mapping)
    const MATCH_FILE_MAP = {
        'understat_bundesliga_all_matches.json': 78,
        'understat_epl_all_matches.json': 39,
        'understat_laliga_all_matches.json': 140,
        'understat_ligue1_all_matches.json': 61,
        'understat_seriea_all_matches.json': 135
    };

    const files = await fs.readdir(MATCHES_DIR);
    
    for (const file of files) {
        if (!MATCH_FILE_MAP[file]) continue;

        const apiId = MATCH_FILE_MAP[file];
        const leagueId = await getLeagueIdByApiId(apiId);

        if (!leagueId) {
            logger.warn(`League ID not found for file: ${file}`);
            continue;
        }

        const content = await fs.readFile(path.join(MATCHES_DIR, file), 'utf-8');
        let data;
        try {
            data = JSON.parse(content);
        } catch(e) {
            logger.error(`Failed to parse ${file}`);
            continue;
        }

        if (!data.matches) continue;

        let matchUpdated = 0;
        let matchFailed = 0;

        for (const match of data.matches) {
            let dateStr = match.date.substring(0, 10); // "2015-08-08" from "2015-08-08 11:45:00"
            const homeTeamId = findV3TeamId(match.home_team, leagueId);
            const awayTeamId = findV3TeamId(match.away_team, leagueId);

            if (!homeTeamId || !awayTeamId) {
                matchFailed++;
                // logger.warn(`[Match] Teams not found: ${match.home_team} vs ${match.away_team}`);
                continue;
            }

            // Check if this specific match has a hardcoded postponed date override
            const overrideKey = `${apiId}_${match.date.substring(0, 10)}_${match.home_team}_${match.away_team}`;
            if (DATE_OVERRIDES[overrideKey]) {
                dateStr = DATE_OVERRIDES[overrideKey];
            }

            // Find fixture in V3 (matching within a generous 48-hour window to avoid TZ timezone offset issues completely)
            const fixture = await db.get(`
                SELECT fixture_id 
                FROM V3_Fixtures 
                WHERE league_id = $1 
                  AND home_team_id = $2 
                  AND away_team_id = $3 
                  AND date >= $4::date - interval '1 day'
                  AND date <= $4::date + interval '2 days'
            `, [leagueId, homeTeamId, awayTeamId, dateStr]);

            if (fixture) {
                // Update
                await db.run(`
                    UPDATE V3_Fixtures
                    SET 
                        understat_id = $1,
                        xg_home = $2,
                        xg_away = $3,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE fixture_id = $4
                `, [match.match_id, match.home_xg, match.away_xg, fixture.fixture_id]);
                matchUpdated++;
            } else {
                matchFailed++;
                // logger.warn(`[Match] Fixture not found in DB: ${match.home_team} vs ${match.away_team} on ${dateStr}`);
            }
        }
        logger.info(`✅ ${file}: Updated ${matchUpdated} fixtures. Failed mapping on ${matchFailed} fixtures.`);
    }
}


async function run() {
    try {
        await init();
        await importCompiledSeasons();
        await importMatches();
        logger.info('🎉 xG Import complete!');
        process.exit(0);
    } catch (e) {
        logger.error({ err: e }, '❌ Import failed');
        process.exit(1);
    }
}

run();
