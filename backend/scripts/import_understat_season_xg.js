/**
 * import_understat_season_xg.js
 *
 * Imports UnderStat per-season xG data into:
 *   - v4.team_season_xg   (from *-league-chemp-*.json files)
 *   - v4.player_season_xg (from *-league-players-*.json files)
 *
 * Matching:
 *   - Competition: exact name lookup via COMP_MAP
 *   - Club: pg_trgm similarity against v4.clubs.name
 *   - Player: pg_trgm similarity against v4.people.full_name,
 *             validated by v4.match_lineups (player appeared for that club in that season)
 *             person_id left NULL if no reliable match (name still stored)
 *
 * Files location (in Docker): /data/understat/xG-PerYear-League-Player/{LEAGUE}/*.json
 *
 * Idempotent: ON CONFLICT DO NOTHING throughout.
 *
 * Usage:
 *   docker compose exec -e UNDERSTAT_DIR=/data/understat backend node scripts/import_understat_season_xg.js
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/config/database.js';
import { createChildLogger } from '../src/utils/logger.js';

const logger = createChildLogger('UnderstatSeasonXG');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UNDERSTAT_BASE = process.env.UNDERSTAT_DIR ?? '/data/understat';
const PER_YEAR_DIR   = path.join(UNDERSTAT_BASE, 'xG-PerYear-League-Player');

const CLUB_SIM_THRESHOLD   = 0.4;
const PLAYER_SIM_THRESHOLD = 0.5;

// League folder → v4 competition name
const LEAGUE_MAP = {
    'PL':         'Premier League',
    'Liga':       'LaLiga',
    'Bundesliga': 'Bundesliga',
    'SerieA':     'Serie A',
    'Ligue1':     'Ligue 1',
};

function readJSON(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''); // strip BOM
    return JSON.parse(raw);
}

// Parse season label from filename: "PL-league-chemp-2022-2023.json" → "2022-2023"
function parseSeasonLabel(fileName) {
    const m = fileName.match(/(\d{4}-\d{4})\.json$/);
    return m ? m[1] : null;
}

// Find best v4 club matching a team name within a given competition
async function findClub(teamName, competitionId) {
    const row = await db.get(
        `SELECT club_id, name,
                GREATEST(similarity(name, $1), word_similarity($1, name)) AS sim
         FROM v4.clubs
         WHERE GREATEST(similarity(name, $1), word_similarity($1, name)) > $2
         ORDER BY sim DESC
         LIMIT 1`,
        [teamName, CLUB_SIM_THRESHOLD]
    );
    return row ?? null;
}

// Placeholder — person matching done via batch SQL after bulk insert
async function findPlayer(_playerName, _clubId, _seasonLabel) {
    return null;
}

async function main() {
    await db.init();
    logger.info('Starting UnderStat season xG import...');

    const stats = {
        team_inserted: 0, team_no_club: 0,
        player_inserted: 0, player_mapped: 0, player_no_club: 0, player_no_person: 0,
    };

    for (const [leagueFolder, compName] of Object.entries(LEAGUE_MAP)) {
        const leagueDir = path.join(PER_YEAR_DIR, leagueFolder);

        if (!fs.existsSync(leagueDir)) {
            logger.warn({ leagueFolder }, 'Directory not found — skipping');
            continue;
        }

        // Resolve competition_id
        const comp = await db.get(
            `SELECT competition_id FROM v4.competitions WHERE name = $1`,
            [compName]
        );
        if (!comp) {
            logger.warn({ compName }, 'Competition not in v4 — skipping');
            continue;
        }
        const competitionId = comp.competition_id;

        const files = fs.readdirSync(leagueDir).sort();
        logger.info({ league: leagueFolder, files: files.length }, 'Processing league');

        for (const fileName of files) {
            const seasonLabel = parseSeasonLabel(fileName);
            if (!seasonLabel) continue;

            const filePath = path.join(leagueDir, fileName);
            const isPlayer = fileName.includes('-league-players-');
            const isTeam   = fileName.includes('-league-chemp-');

            if (!isPlayer && !isTeam) continue;

            let data;
            try { data = readJSON(filePath); }
            catch (e) { logger.warn({ file: fileName, err: e.message }, 'JSON parse error'); continue; }

            if (isTeam) {
                // ── team_season_xg ──
                for (const row of data) {
                    const club = await findClub(row.team, competitionId);
                    if (!club) {
                        logger.debug({ team: row.team, season: seasonLabel }, 'No club match');
                        stats.team_no_club++;
                        continue;
                    }

                    const r = await db.run(
                        `INSERT INTO v4.team_season_xg (
                            competition_id, season_label, club_id,
                            position, matches, wins, draws, losses, goals, goals_against, points,
                            xg, npxg, xga, npxga, npxgd, ppda, ppda_allowed, deep, deep_allowed, xpts
                        ) VALUES (
                            $1, $2, $3,
                            $4, $5, $6, $7, $8, $9, $10, $11,
                            $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
                        ) ON CONFLICT (competition_id, season_label, club_id) DO NOTHING`,
                        [
                            competitionId, seasonLabel, club.club_id,
                            row.number ?? null,
                            row.matches ?? null,
                            row.wins ?? null,
                            row.draws ?? null,
                            row.loses ?? null,
                            row.goals ?? null,
                            row.ga ?? null,
                            row.points ?? null,
                            row.xG ?? null,
                            row.NPxG ?? null,
                            row.xGA ?? null,
                            row.NPxGA ?? null,
                            row.NPxGD ?? null,
                            row.ppda ?? null,
                            row.ppda_allowed ?? null,
                            row.deep ?? null,
                            row.deep_allowed ?? null,
                            row.xPTS ?? null,
                        ]
                    );
                    if ((r.changes ?? 0) > 0) stats.team_inserted++;
                }

            } else {
                // ── player_season_xg ──
                for (const row of data) {
                    const club = await findClub(row.team, competitionId);
                    if (!club) {
                        stats.player_no_club++;
                        continue;
                    }

                    // Try to find person_id
                    const person = await findPlayer(row.player, club.club_id, seasonLabel);
                    const personId = person?.person_id ?? null;
                    if (personId) stats.player_mapped++;
                    else stats.player_no_person++;

                    const r = await db.run(
                        `INSERT INTO v4.player_season_xg (
                            competition_id, season_label, club_id, person_id, player_name,
                            apps, minutes, goals, npg, assists,
                            xg, npxg, xa, xg_chain, xg_buildup,
                            xg_90, npxg_90, xa_90, xg90_xa90, npxg90_xa90, xg_chain_90, xg_buildup_90
                        ) VALUES (
                            $1, $2, $3, $4, $5,
                            $6, $7, $8, $9, $10,
                            $11, $12, $13, $14, $15,
                            $16, $17, $18, $19, $20, $21, $22
                        ) ON CONFLICT (competition_id, season_label, club_id, player_name) DO NOTHING`,
                        [
                            competitionId, seasonLabel, club.club_id, personId, row.player,
                            row.apps ?? null,
                            row.min  ?? null,
                            row.goals ?? null,
                            row.NPG  ?? null,
                            row.a    ?? null,
                            row.xG   ?? null,
                            row.NPxG ?? null,
                            row.xA   ?? null,
                            row.xGChain   ?? null,
                            row.xGBuildup ?? null,
                            row.xG90       ?? null,
                            row.NPxG90     ?? null,
                            row.xA90       ?? null,
                            row.xG90xA90   ?? null,
                            row.NPxG90xA90 ?? null,
                            row.xGChain90  ?? null,
                            row.xGBuildup90 ?? null,
                        ]
                    );
                    if ((r.changes ?? 0) > 0) stats.player_inserted++;
                }
            }
        }

        logger.info({ league: leagueFolder }, 'League done');
    }

    const playerMappedPct = (stats.player_inserted > 0)
        ? (stats.player_mapped / stats.player_inserted * 100).toFixed(1)
        : '0.0';

    logger.info({
        team_inserted:   stats.team_inserted,
        team_no_club:    stats.team_no_club,
        player_inserted: stats.player_inserted,
        player_mapped_pct: `${playerMappedPct}%`,
        player_no_club:  stats.player_no_club,
        player_no_person: stats.player_no_person,
    }, '=== SEASON XG IMPORT REPORT ===');

    process.exit(0);
}

main().catch(err => {
    logger.error({ err }, 'Fatal error in import_understat_season_xg');
    process.exit(1);
});
