/**
 * migrate_xg_v3_to_v4.js
 *
 * Migrates V3_League_Season_xG → v4.league_season_xg.
 * Uses pg_trgm similarity matching to link V3 leagues/teams to V4 competitions/clubs.
 *
 * Idempotent: ON CONFLICT DO NOTHING — safe to re-run.
 *
 * Usage:
 *   cd backend && node scripts/migrate_xg_v3_to_v4.js
 *
 * Prerequisites:
 *   - Migrations 20260408_01 → 20260408_04 applied
 */

import 'dotenv/config';
import db from '../src/config/database.js';
import { createChildLogger } from '../src/utils/logger.js';

const logger = createChildLogger('XGMigrationScript');

const SIMILARITY_THRESHOLD = 0.5;

async function main() {
    await db.init();
    logger.info('Starting V3_League_Season_xG → v4.league_season_xg migration...');

    // Fetch all V3 xG records with league and team names
    const v3Records = await db.all(`
        SELECT
            xg.league_id,
            xg.season_year,
            xg.team_id,
            xg.xg_for,
            xg.xg_against,
            xg.xg_points,
            xg.np_xg,
            xg.ppda,
            vl.name  AS league_name,
            vt.name  AS team_name
        FROM V3_League_Season_xG xg
        JOIN V3_Leagues vl ON vl.league_id = xg.league_id
        JOIN V3_Teams   vt ON vt.team_id   = xg.team_id
        ORDER BY xg.season_year, xg.league_id, xg.team_id
    `);

    logger.info({ total: v3Records.length }, 'V3 xG records to migrate');

    const stats = { inserted: 0, no_competition: 0, no_club: 0, conflict: 0 };

    for (const rec of v3Records) {
        const seasonLabel = `${rec.season_year}/${rec.season_year + 1}`;

        // Find best matching v4 competition via pg_trgm
        const comp = await db.get(
            `SELECT competition_id, name, similarity(name, ?) AS sim
             FROM v4.competitions
             WHERE similarity(name, ?) > ?
             ORDER BY sim DESC
             LIMIT 1`,
            [rec.league_name, rec.league_name, SIMILARITY_THRESHOLD]
        );

        if (!comp) {
            logger.warn({ league: rec.league_name, season: seasonLabel }, 'No v4 competition match — skipping');
            stats.no_competition++;
            continue;
        }

        // Find best matching v4 club via pg_trgm
        const club = await db.get(
            `SELECT club_id, name, similarity(name, ?) AS sim
             FROM v4.clubs
             WHERE similarity(name, ?) > ?
             ORDER BY sim DESC
             LIMIT 1`,
            [rec.team_name, rec.team_name, SIMILARITY_THRESHOLD]
        );

        if (!club) {
            logger.warn({ team: rec.team_name, league: rec.league_name }, 'No v4 club match — skipping');
            stats.no_club++;
            continue;
        }

        const result = await db.run(
            `INSERT INTO v4.league_season_xg
                (competition_id, season_label, club_id, xg_for, xg_against, xg_points, np_xg, ppda)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (competition_id, season_label, club_id) DO NOTHING`,
            [
                comp.competition_id,
                seasonLabel,
                club.club_id,
                rec.xg_for,
                rec.xg_against,
                rec.xg_points,
                rec.np_xg,
                rec.ppda,
            ]
        );

        if ((result.changes ?? 0) > 0) {
            stats.inserted++;
        } else {
            stats.conflict++;
        }
    }

    logger.info({
        total_v3: v3Records.length,
        inserted: stats.inserted,
        skipped_no_competition: stats.no_competition,
        skipped_no_club: stats.no_club,
        skipped_conflict: stats.conflict,
    }, '=== XG MIGRATION REPORT ===');

    if (stats.no_competition > 0 || stats.no_club > 0) {
        logger.warn(
            { no_competition: stats.no_competition, no_club: stats.no_club },
            'Some records could not be matched. Review logs above for details.'
        );
    }

    process.exit(0);
}

main().catch(err => {
    logger.error({ err }, 'Fatal error in migrate_xg_v3_to_v4');
    process.exit(1);
});
