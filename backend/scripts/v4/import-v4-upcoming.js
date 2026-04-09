import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.resolve(__dirname, '../../upcoming_all_leagues.json');

function decodeHtml(str) {
    if (!str) return str;
    return str.replace(/&amp;/g, '&')
              .replace(/&#039;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
}

const MANUAL_LEAGUE_MAPPING = {
    "Ligue1": "6899188781832966663",
    "PremierLeague": "3604346402664543758",
    "SerieA": "1914322962087976890",
    "SerieB": "1412758677433370226",
    "LaLiga": "9059522516759045883",
    "Bundesliga": "2767296497201676844",
    "LigaPortugal": "3184552495577988756",
    "Eredivisie": "7594370283800582861",
    "Ligue2": "5734101282419987521",
    "Championship": "Championship"
};

const MANUAL_CLUB_MAPPING = {
    "Man City": "Manchester City", "Manchester Utd.": "Manchester United", "Nott'm Forest": "Nottingham Forest",
    "West Ham Utd": "West Ham United", "Paris SG": "Paris Saint-Germain", "LOSC Lille": "LOSC Lille",
    "Marseille": "Olympique de Marseille", "Monaco": "AS Monaco", "Stade Rennais": "Stade Rennais FC",
    "Ol. Lyonnais": "Olympique Lyonnais", "RC Lens": "RC Lens", "Lens": "RC Lens",
    "RC Strasbourg": "RC Strasbourg Alsace", "Strasbourg": "RC Strasbourg Alsace", "Brest": "Stade Brestois 29",
    "Stade Brestois": "Stade Brestois 29", "Reims": "Stade de Reims", "Nice": "OGC Nice",
    "Montpellier": "Montpellier Hérault SC", "Toulouse": "Toulouse FC", "Lyon": "Olympique Lyonnais",
    "PSG": "Paris Saint-Germain", "Arsenal": "Arsenal FC", "Liverpool": "FC Liverpool", "Chelsea": "Chelsea FC",
    "Tottenham": "Tottenham Hotspur", "Newcastle": "Newcastle United", "Aston Villa": "Aston Villa",
    "Everton": "Everton FC", "Bologna": "Bologna FC 1909", "Lazio": "SS Lazio", "Roma": "AS Roma",
    "Inter": "FC Internazionale", "Milan": "AC Milan", "Juventus": "Juventus Turin", "Naples": "SSC Napoli"
};

const normalize = (n) => n.toLowerCase()
    .replace(/\b(utd|fc|sg|afc|rc|ogc|as|ol|aj|sco|ac)\b/g, '')
    .replace(/[^\w\s]/g, '')
    .trim();

async function findClub(name, competitionId) {
    const decodedName = decodeHtml(name);
    const mappedName = MANUAL_CLUB_MAPPING[decodedName] || decodedName;
    const normName = normalize(mappedName);
    
    // 1. Try exact name match
    let club = await db.get("SELECT club_id, name FROM v4.clubs WHERE LOWER(name) = ?", [mappedName.toLowerCase()]);
    if (club) return club;

    // 2. Try partial match with competition filter
    if (competitionId) {
        club = await db.get(`
            SELECT DISTINCT c.club_id, c.name 
            FROM v4.clubs c
            JOIN v4.matches m ON (m.home_club_id = c.club_id OR m.away_club_id = c.club_id)
            WHERE m.competition_id = ? AND LOWER(c.name) LIKE ?
        `, [competitionId, `%${normName}%`]);
        if (club) return club;
    }

    // 3. Fallback: Search all clubs and find best fuzzy match
    const allClubs = await db.all("SELECT club_id, name FROM v4.clubs WHERE LOWER(name) LIKE ?", [`%${normName.substring(0, 5)}%`]);
    return allClubs.find(c => {
        const cNorm = normalize(c.name);
        return cNorm.includes(normName) || normName.includes(cNorm);
    });
}

const seasonCache = new Map();
async function getLatestSeason(competitionId, matchSeason) {
    if (seasonCache.has(competitionId)) return seasonCache.get(competitionId);

    const latest = await db.get("SELECT MAX(season_label) as latest FROM v4.matches WHERE competition_id = ?", [competitionId]);
    let label = latest?.latest || (matchSeason ? `${matchSeason}-${matchSeason + 1}` : '2025-2026');
    
    // If the latest season is very old, default to modern format
    if (label && Number(label.split('-')[0]) < 2024) {
        label = '2025-2026';
    }
    
    seasonCache.set(competitionId, label);
    return label;
}

async function importAllUpcoming() {
    await db.init();
    logger.info('Starting GENERIC V4 Match Data Orchestrator');
    
    if (!fs.existsSync(jsonPath)) throw new Error(`JSON file not found at ${jsonPath}`);

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const matches = data.matches;
    logger.info({ total_json_entries: matches.length }, 'Loaded matches from JSON');

    let syncedCount = 0;
    let missingLeagues = new Set();
    let missingClubs = new Set();
    const leagueCache = new Map();

    for (const match of matches) {
        try {
            // 1. Resolve Competition ID
            let competitionId = leagueCache.get(match.league);
            if (!competitionId) {
                const mapping = MANUAL_LEAGUE_MAPPING[match.league];
                if (mapping && /^\d+$/.test(mapping)) {
                    competitionId = mapping;
                } else {
                    const dbName = mapping || match.league;
                    const competition = await db.get(
                        "SELECT competition_id FROM v4.competitions WHERE name ILIKE ? OR name ILIKE ?",
                        [dbName, `%${dbName}%`]
                    );
                    if (competition) competitionId = competition.competition_id;
                }
                if (!competitionId) {
                    missingLeagues.add(match.league);
                    continue;
                }
                leagueCache.set(match.league, competitionId);
            }

            // 2. Resolve Season Label (Automated Detection)
            const seasonLabel = await getLatestSeason(competitionId, match.season);

            // 3. Resolve Clubs
            const homeClub = await findClub(match.home, competitionId);
            const awayClub = await findClub(match.away, competitionId);

            if (!homeClub || !awayClub) {
                if (!homeClub) missingClubs.add(match.home);
                if (!awayClub) missingClubs.add(match.away);
                continue;
            }

            // 4. Robust Match ID Generation
            const hashString = `${competitionId}-${homeClub.club_id}-${awayClub.club_id}-${match.date}`;
            let hash = 0;
            for (let i = 0; i < hashString.length; i++) {
                hash = ((hash << 5) - hash) + hashString.charCodeAt(i);
                hash |= 0; 
            }
            const matchId = 9920000000 + Math.abs(hash);

            // 5. UPSERT strictly into v4.matches
            await db.run(`
                INSERT INTO v4.matches (
                    match_id, source_provider, source_match_id, competition_id, 
                    season_label, match_date, home_club_id, away_club_id,
                    home_score, away_score, round_label, matchday, date_label
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (match_id) DO UPDATE SET
                    season_label = EXCLUDED.season_label,
                    match_date = EXCLUDED.match_date,
                    round_label = EXCLUDED.round_label,
                    matchday = EXCLUDED.matchday,
                    date_label = EXCLUDED.date_label,
                    home_club_id = EXCLUDED.home_club_id,
                    away_club_id = EXCLUDED.away_club_id,
                    source_provider = EXCLUDED.source_provider
            `, [
                matchId,
                'generic-v4-orchestrator',
                `source-${matchId}`,
                competitionId,
                seasonLabel,
                match.date,
                homeClub.club_id,
                awayClub.club_id,
                null,
                null,
                `J${match.matchday}`,
                match.matchday,
                `${match.date} ${match.time || ''}`
            ]);

            syncedCount++;
            if (syncedCount % 1000 === 0) logger.info({ progress: syncedCount }, 'Import progress...');

        } catch (err) {
            logger.error({ match, err }, 'Import failed for match');
        }
    }

    logger.info({ syncedCount, total: matches.length }, 'V4 Generics Orchestration completed');
    if (missingLeagues.size > 0) console.log('\n--- MISSING LEAGUES ---\n' + [...missingLeagues].sort().join('\n'));
    if (missingClubs.size > 0) console.log(`\nTotal missing clubs: ${missingClubs.size} (Check logs for mapping failures)`);
}

importAllUpcoming()
    .catch(err => { console.error(err); process.exit(1); })
    .finally(() => { setTimeout(() => process.exit(0), 1000); });
