import logger from '../../utils/logger.js';

const INDEX_NAME = 'idx_v4_people_norm_name_unique';

async function indexExists(db) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'v4' AND indexname = $1
        ) AS exists`,
        [INDEX_NAME]
    );
    return Boolean(row?.exists);
}

/**
 * Migration : contrainte d'unicité sur le nom normalisé dans v4.people
 *
 * Empêche les futurs doublons typographiques (accents, tirets, espaces).
 * Normalisation : unaccent + retrait des caractères non-alphanumériques + minuscules
 *
 * PRÉREQUIS : exécuter fix_people_duplicates.js --execute avant cette migration,
 * sinon l'index UNIQUE échouera si des doublons existent encore.
 */
export const up = async (db) => {
    logger.info('Creating unique normalized name index on v4.people...');

    // Activer unaccent si pas déjà disponible
    await db.run(`CREATE EXTENSION IF NOT EXISTS unaccent`);

    // unaccent() est STABLE, pas IMMUTABLE — PostgreSQL refuse les index fonctionnels
    // sur des fonctions non-IMMUTABLE. On crée un wrapper IMMUTABLE.
    await db.run(`
        CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
        RETURNS text
        LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
        AS $$ SELECT public.unaccent('public.unaccent', $1) $$
    `);

    if (await indexExists(db)) {
        logger.info(`Index ${INDEX_NAME} already exists — skipping`);
        return;
    }

    await db.run(`
        CREATE UNIQUE INDEX ${INDEX_NAME}
        ON v4.people(lower(regexp_replace(public.immutable_unaccent(full_name), '[^a-zA-Z0-9]', '', 'g')))
    `);

    logger.info(`Index ${INDEX_NAME} created — future typographic duplicates will be rejected at insert.`);
};

export const down = async (db) => {
    await db.run(`DROP INDEX IF EXISTS v4.${INDEX_NAME}`);
    logger.info(`Index ${INDEX_NAME} dropped`);
};
