import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../../xGData/xG-PerYear-League-Player');

const LEAGUE_MAPPING = {
    'Bundesliga': 78,
    'PL': 39,
    'Liga': 140,
    'Ligue1': 61,
    'SerieA': 135
};

const TEAM_NAME_OVERRIDES = {
    // Bundesliga
    'Hoffenheim': '1899 Hoffenheim',
    'FC Cologne': '1. FC Köln',
    'Schalke 04': 'FC Schalke 04',
    'Bayern Munich': 'Bayern München',
    'Borussia M.Gladbach': 'Borussia Mönchengladbach',
    'Darmstadt': 'SV Darmstadt 98',
    'Ingolstadt': 'FC Intolstadt 04',
    'Hamburg SV': 'Hamburger SV',
    'Mainz 05': 'FSV Mainz 05',
    'Hertha Berlin': 'Hertha BSC',
    'Fortuna Duesseldorf': 'Fortuna Düsseldorf',
    'Greuther Fuerth': 'SpVgg Greuther Fürth',
    'RasenBallsport Leipzig': 'RB Leipzig',
    'Werder Bremen': 'Werder Bremen',
    'Wolfsburg': 'VfL Wolfsburg',
    'Augsburg': 'FC Augsburg',
    'Freiburg': 'SC Freiburg',
    'Bayer Leverkusen': 'Bayer Leverkusen',
    'Eintracht Frankfurt': 'Eintracht Frankfurt',
    'Borussia Dortmund': 'Borussia Dortmund',

    // EPL
    'Sheffield United': 'Sheffield Utd',
    'Wolverhampton Wanderers': 'Wolves',
    'Newcastle United': 'Newcastle',
    'West Bromwich Albion': 'West Brom',
    'Stoke': 'Stoke City',
    'Leicester': 'Leicester',
    'Norwich': 'Norwich',
    'Sunderland': 'Sunderland',
    'Swansea': 'Swansea',
    'Bournemouth': 'Bournemouth',
    'Tottenham': 'Tottenham',

    // Ligue 1
    'Paris Saint Germain': 'Paris Saint Germain',
    'Saint-Etienne': 'Saint Etienne',
    'Troyes': 'Estac Troyes',
    'GFC Ajaccio': 'Gazelec FC Ajaccio',
    'Reims': 'Reims',
    'Nice': 'Nice',
    'Nimes': 'Nimes',
    'Lorient': 'Lorient',
    'Montpellier': 'Montpellier',
    'Bordeaux': 'Bordeaux',

    // Serie A
    'Milan': 'AC Milan',
    'Roma': 'AS Roma',
    'Verona': 'Hellas Verona',
    'Napoli': 'Napoli',
    'Inter': 'Inter',
    'Sassuolo': 'Sassuolo',
    'Genoa': 'Genoa',
    'Lazio': 'Lazio',
    'Fiorentina': 'Fiorentina',

    // La Liga
    'Real Sociedad': 'Real Sociedad',
    'Atletico Madrid': 'Atletico Madrid',
    'Deportivo La Coruna': 'Deportivo La Coruna',
    'Athletic Club': 'Athletic Club',
    'Celta Vigo': 'Celta Vigo',
    'Villarreal': 'Villarreal',
    'Granada': 'Granada CF'
};

const NICKNAME_MAP = {
    'Chicharito': 'Javier Hernandez',
    'Raffael': 'Raffael Caetano de Araujo',
    'Pepe': 'Képler Laveran Lima Ferreira',
    'Nani': 'Luís Carlos Almeida da Cunha',
    'Fred': 'Frederico Chaves Guedes',
    'Edu': 'Eduardo Gonçalves de Oliveira',
    'Mathis Cherki': 'R. Cherki'
};

function normalize(name) {
    if (!name) return '';
    // Handle specific characters that NFD doesn't catch
    let n = name.toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ł/g, 'l')
        .replace(/ø/g, 'o')
        .replace(/æ/g, 'ae')
        .replace(/ß/g, 'ss')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove accents

    return n.replace(/[^a-z0-9\s]/g, ' ') // Remove non-alphanumeric
        .replace(/\s+/g, ' ')
        .trim();
}

function matchWithInitials(understatName, dbName, strict = false) {
    // Check nickname map
    const mappedName = NICKNAME_MAP[understatName] || understatName;
    const un = normalize(mappedName);
    const dn = normalize(dbName);
    if (un === dn) return true;

    const unParts = un.split(' ').filter(p => p.length > 0);
    const dnParts = dn.split(' ').filter(p => p.length > 0);

    if (unParts.length === 0 || dnParts.length === 0) return false;

    // Strategy 1: Last name and Initial match (order independent)
    function checkInitialMatch(partsA, partsB) {
        const lastA = partsA[partsA.length - 1];
        const lastB = partsB[partsB.length - 1];
        if (lastA !== lastB) return false;

        const initialsA = partsA.map(p => p[0]);
        const initialsB = partsB.map(p => p[0]);
        // Every initial in smaller must be in larger
        const [small, large] = initialsA.length <= initialsB.length ? [initialsA, initialsB] : [initialsB, initialsA];
        return small.every(i => large.includes(i));
    }

    if (checkInitialMatch(unParts, dnParts)) return true;

    // Strategy 2: Intersection of parts (order independent)
    const [shorter, longer] = unParts.length <= dnParts.length ? [unParts, dnParts] : [dnParts, unParts];
    const matchesCount = shorter.filter(s => longer.some(l => l.startsWith(s) || s.startsWith(l))).length;

    // If we have at least 2 parts matching or the only part matches
    if (shorter.length === 1) {
        if (strict && (unParts.length !== dnParts.length)) return false;
        return matchesCount === 1;
    }
    return matchesCount >= 2;
}

const ALL_V3_TEAMS = [];

function findTeamId(understatName, leagueId, leagueTeams, allTeams) {
    const normalizedName = normalize(understatName);
    
    // 1. Exact match in league teams
    let match = leagueTeams.find(t => normalize(t.name) === normalizedName);
    if (match) return match.team_id;

    // 2. Overrides
    const override = TEAM_NAME_OVERRIDES[understatName];
    if (override) {
        match = leagueTeams.find(t => normalize(t.name) === normalize(override));
        if (match) return match.team_id;
        match = allTeams.find(t => normalize(t.name) === normalize(override));
        if (match) return match.team_id;
    }

    // 3. Normalized includes match in league teams
    match = leagueTeams.find(t => normalize(t.name).includes(normalizedName) || normalizedName.includes(normalize(t.name)));
    if (match) return match.team_id;

    // 4. Global match
    match = allTeams.find(t => normalize(t.name) === normalizedName);
    if (match) return match.team_id;

    // 5. Global includes match (Aggressive)
    match = allTeams.find(t => normalize(t.name).includes(normalizedName) || normalizedName.includes(normalize(t.name)));
    if (match) return match.team_id;

    return null;
}

async function runImport() {
    await db.init();
    logger.info('🚀 Connected to DB for Player xG Import');

    const allV3Teams = await db.all("SELECT team_id, name FROM V3_Teams");

    const leagues = fs.readdirSync(DATA_DIR).filter(item => {
        const itemPath = path.join(DATA_DIR, item);
        return fs.statSync(itemPath).isDirectory();
    });

    for (const leagueToken of leagues) {
        const apiId = LEAGUE_MAPPING[leagueToken];
        if (!apiId) {
            logger.warn(`⚠️ Skipped unknown leagueToken: ${leagueToken}`);
            continue;
        }

        const league = await db.get("SELECT league_id FROM V3_Leagues WHERE api_id = $1", [apiId]);
        if (!league) {
            logger.warn(`⚠️ League not found in DB for API ID ${apiId} (${leagueToken})`);
            continue;
        }
        const leagueId = league.league_id;

        const leagueDirPath = path.join(DATA_DIR, leagueToken);
        const playerFiles = fs.readdirSync(leagueDirPath).filter(f => f.includes('-players-'));

        logger.info(`⚽ Importing ${leagueToken} (API ID: ${apiId}, V3 ID: ${leagueId})...`);

        // Prefetch teams for this league
        const leagueTeams = await db.all(`
            SELECT DISTINCT t.team_id, t.name 
            FROM V3_Teams t
            JOIN V3_Fixtures f ON t.team_id = f.home_team_id OR t.team_id = f.away_team_id
            WHERE f.league_id = $1
        `, [leagueId]);

        // Prefetch players
        const allPlayers = await db.all("SELECT player_id, name FROM V3_Players");
        const playerMap = new Map();
        allPlayers.forEach(p => {
            playerMap.set(normalize(p.name), p.player_id);
        });

        for (const file of playerFiles) {
            const seasonYear = parseInt(file.match(/(\d{4})-\d{4}/)?.[1] || file.match(/(\d{4})/)?.[1]);
            if (!seasonYear) continue;

            logger.info(`  📂 Processing ${file} (Season: ${seasonYear})`);
            const filePath = path.join(leagueDirPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const playersData = JSON.parse(content.replace(/^\uFEFF/, ''));

            let importedCount = 0;
            let skippedCount = 0;

            for (const p of playersData) {
                // 1. Resolve Team
                const teamString = p.team.split(',')[0];
                const teamId = findTeamId(teamString, leagueId, leagueTeams, allV3Teams);

                if (!teamId) {
                    logger.warn(`    ⚠️ Team not found: ${teamString} for player ${p.player}`);
                    skippedCount++;
                    continue;
                }

                // 2. Resolve Player (Optimized: Use league/season/team stats)
                const seasonPlayers = await db.all(`
                    SELECT p.player_id, p.name, p.firstname, p.lastname
                    FROM V3_Player_Stats ps
                    JOIN V3_Players p ON ps.player_id = p.player_id
                    WHERE ps.league_id = $1 AND ps.season_year = $2 AND ps.team_id = $3
                `, [leagueId, seasonYear, teamId]);

                const normalizedPlayerName = normalize(p.player);
                let playerId = null;

                // Priority 1 & 2: Specialized matching in season squad
                let match = seasonPlayers.find(sp => matchWithInitials(p.player, sp.name));
                if (match) playerId = match.player_id;

                // Priority 3: Global fallback (last resort)
                if (!playerId) {
                    playerId = playerMap.get(normalizedPlayerName);
                }

                if (!playerId) {
                    // Try global match with initials (slow but safe)
                    for (const [name, id] of playerMap.entries()) {
                        if (matchWithInitials(p.player, name, true)) {
                            playerId = id;
                            break;
                        }
                    }
                }

                if (!playerId) {
                    // FINAL FALLBACK: Create a "Shadow" player since we have Understat data but no API identity
                    logger.info(`    ✨ Creating shadow player: ${p.player}`);
                    const parts = p.player.split(' ');
                    const firstname = parts[0];
                    const lastname = parts.length > 1 ? parts.slice(1).join(' ') : '';
                    
                    const insertPlayer = await db.run(
                        "INSERT INTO V3_Players (name, firstname, lastname, nationality) VALUES (?, ?, ?, ?) RETURNING player_id",
                        [p.player, firstname, lastname, 'Unknown']
                    );
                    playerId = insertPlayer.lastInsertRowid || insertPlayer.player_id || insertPlayer[0]?.player_id;
                    
                    if (playerId) {
                        // Create basic stats entry so they appear in league squad explorers
                        await db.run(
                            "INSERT INTO V3_Player_Stats (player_id, team_id, league_id, season_year, games_appearences, games_position) VALUES (?, ?, ?, ?, 0, 'Unknown')",
                            [playerId, teamId, leagueId, seasonYear]
                        );
                        // Update cache for this run
                        playerMap.set(normalizedPlayerName, playerId);
                        logger.info(`    ✅ Linked shadow player ${p.player} to Team ID ${teamId}`);
                    }
                }

                if (!playerId) {
                    logger.warn(`    ❌ Player not found and could not be created: ${p.player} (${p.team})`);
                    skippedCount++;
                    continue;
                }

                // 3. Upsert xG Data
                try {
                    await db.run(`
                        INSERT INTO V3_Player_Season_xG (
                            player_id, team_id, league_id, season_year,
                            apps, minutes, goals, npg, assists,
                            xg, npxg, xa, xg_chain, xg_buildup,
                            xg_90, npxg_90, xa_90, xg90_xa90, npxg90_xa90,
                            xg_chain_90, xg_buildup_90, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP)
                        ON CONFLICT (player_id, league_id, season_year, team_id) DO UPDATE SET
                            apps = EXCLUDED.apps,
                            minutes = EXCLUDED.minutes,
                            goals = EXCLUDED.goals,
                            npg = EXCLUDED.npg,
                            assists = EXCLUDED.assists,
                            xg = EXCLUDED.xg,
                            npxg = EXCLUDED.npxg,
                            xa = EXCLUDED.xa,
                            xg_chain = EXCLUDED.xg_chain,
                            xg_buildup = EXCLUDED.xg_buildup,
                            xg_90 = EXCLUDED.xg_90,
                            npxg_90 = EXCLUDED.npxg_90,
                            xa_90 = EXCLUDED.xa_90,
                            xg90_xa90 = EXCLUDED.xg90_xa90,
                            npxg90_xa90 = EXCLUDED.npxg90_xa90,
                            xg_chain_90 = EXCLUDED.xg_chain_90,
                            xg_buildup_90 = EXCLUDED.xg_buildup_90,
                            updated_at = EXCLUDED.updated_at
                    `, [
                        playerId, teamId, leagueId, seasonYear,
                        p.apps, p.min, p.goals, p.NPG, p.a,
                        p.xG, p.NPxG, p.xA, p.xGChain, p.xGBuildup,
                        p.xG90, p.NPxG90, p.xA90, p.xG90xA90, p.NPxG90xA90,
                        p.xGChain90, p.xGBuildup90
                    ]);
                    importedCount++;
                } catch (err) {
                    logger.error({ err, p }, `    🔥 Error upserting player xG`);
                }
            }
            logger.info(`    ✅ ${importedCount} players imported, ${skippedCount} skipped.`);
        }
    }

    process.exit(0);
}

runImport().catch(err => {
    logger.error(err);
    process.exit(1);
});
