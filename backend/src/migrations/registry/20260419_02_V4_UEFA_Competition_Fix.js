import logger from '../../utils/logger.js';

/**
 * Migration 20260419_02 — Fix UEFA competition metadata
 *
 * Problème identifié : UEFA Champions League et UEFA Europa League avaient
 * country_id = Maroc (vestige d'un import Transfermarkt corrompu où l'UEL
 * était mappée sur "maroc-botolad2"). L'UCL avait hérité ce mauvais country_id
 * lors de sa création par import-covered-league.js.
 *
 * Corrections appliquées :
 * - UCL : country_id → International-Club, competition_type → 'cup'
 * - UEL : country_id → International-Club, competition_type → 'cup',
 *         source_key → 'international-club-europa-league'
 *
 * Logique de cohérence :
 * - competition_type = 'international' → tournois de sélections nationales (CdM, Euro)
 * - competition_type = 'cup' → coupes continentales de clubs (UCL, UEL, UCL)
 * - competition_type = 'league' → championnats domestiques uniquement
 * - country_id = International-Club (2308858345885688936) → compétitions UEFA de clubs
 * - country_id = International-Nation (4073567339792430437) → compétitions nationales
 */

const INTERNATIONAL_CLUB_ID = '2308858345885688936';

export const up = async (db) => {
    // Fix UEFA Champions League
    const ucl = await db.get(
        `SELECT competition_id, country_id::text, competition_type, source_key
         FROM v4.competitions WHERE name = 'UEFA Champions League'`
    );
    if (ucl) {
        await db.run(
            `UPDATE v4.competitions
             SET country_id = ?,
                 competition_type = 'cup',
                 source_key = 'international-club-champions-league'
             WHERE competition_id = ?`,
            [INTERNATIONAL_CLUB_ID, ucl.competition_id]
        );
        logger.info({
            competition_id: ucl.competition_id,
            old_country_id: ucl.country_id,
            old_type: ucl.competition_type,
            old_source_key: ucl.source_key,
        }, 'Fixed: UEFA Champions League → International-Club, type=cup');
    } else {
        logger.warn({}, 'UEFA Champions League not found — skipped');
    }

    // Fix UEFA Europa League
    const uel = await db.get(
        `SELECT competition_id, country_id::text, competition_type, source_key
         FROM v4.competitions WHERE name = 'UEFA Europa League'`
    );
    if (uel) {
        await db.run(
            `UPDATE v4.competitions
             SET country_id = ?,
                 competition_type = 'cup',
                 source_key = 'international-club-europa-league'
             WHERE competition_id = ?`,
            [INTERNATIONAL_CLUB_ID, uel.competition_id]
        );
        logger.info({
            competition_id: uel.competition_id,
            old_country_id: uel.country_id,
            old_type: uel.competition_type,
            old_source_key: uel.source_key,
        }, 'Fixed: UEFA Europa League → International-Club, type=cup, source_key corrected');
    } else {
        logger.warn({}, 'UEFA Europa League not found — skipped');
    }

    // Vérification post-fix
    const check = await db.all(
        `SELECT c.name, c.competition_type, c.source_key, co.name as country_name
         FROM v4.competitions c
         JOIN v4.countries co ON co.country_id = c.country_id
         WHERE c.name IN ('UEFA Champions League', 'UEFA Europa League')`
    );
    check.forEach(r => {
        if (r.country_name !== 'International-Club') {
            logger.error({ name: r.name, country: r.country_name }, 'INTEGRITY ERROR: still wrong country after fix');
        }
    });
};

export const down = async (db) => {
    // Revenir au mauvais état n'a pas de sens — down est un no-op documenté
    logger.warn({}, 'down() for 20260419_02 is a no-op: restoring Maroc country_id would be incorrect');
};
