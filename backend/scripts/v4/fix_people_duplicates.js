/**
 * fix_people_duplicates.js — Bulk SQL deduplication
 *
 * Détecte les doublons via normalisation unaccent + regex (accents, tirets, espaces).
 * Utilise une TEMP TABLE pour des updates en masse (O(1) requêtes, pas O(n)).
 * Couvre toutes les tables FK : match_lineups, match_events (x2), player_season_xg, matches.
 *
 * Usage :
 *   node scripts/v4/fix_people_duplicates.js --dry-run   (défaut, aucune modif)
 *   node scripts/v4/fix_people_duplicates.js --execute   (applique le dédoublonnage)
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const { Pool } = pg;

const DEFAULT_PHOTO = 'https://tmssl.akamaized.net//images/foto/normal/default.jpg?lm=1';
const DRY_RUN = !process.argv.includes('--execute');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://statfoot_user:statfoot_password@statfoot-db:5432/statfoot',
});

async function run() {
    const client = await pool.connect();

    try {
        console.log(`\n=== fix_people_duplicates.js [${DRY_RUN ? 'DRY-RUN' : 'EXECUTE'}] ===\n`);

        // Vérifier que unaccent est disponible
        const { rows: extCheck } = await client.query(`SELECT 1 FROM pg_extension WHERE extname = 'unaccent'`);
        if (extCheck.length === 0) {
            console.warn('WARN: Extension unaccent non trouvée. Installation...');
            await client.query('CREATE EXTENSION IF NOT EXISTS unaccent');
        }
        console.log('OK: Extension unaccent disponible.');

        // 1. Construire le mapping duplicate_id -> canonical_id
        console.log('Calcul du mapping duplicate -> canonique...');
        const { rows: mapping } = await client.query(`
            WITH ranked AS (
                SELECT
                    person_id,
                    full_name,
                    LOWER(REGEXP_REPLACE(unaccent(full_name), '[^a-zA-Z0-9]', '', 'g')) AS norm_name,
                    ROW_NUMBER() OVER (
                        PARTITION BY LOWER(REGEXP_REPLACE(unaccent(full_name), '[^a-zA-Z0-9]', '', 'g'))
                        ORDER BY
                            (photo_url IS NOT NULL
                             AND photo_url != $1
                             AND photo_url NOT LIKE '%default%') DESC,
                            person_id ASC
                    ) AS rank
                FROM v4.people
                WHERE full_name IS NOT NULL
            ),
            canonical AS (
                SELECT person_id AS canonical_id, norm_name
                FROM ranked WHERE rank = 1
            )
            SELECT
                r.person_id AS duplicate_id,
                c.canonical_id,
                r.full_name AS duplicate_name,
                r.norm_name
            FROM ranked r
            JOIN canonical c ON r.norm_name = c.norm_name
            WHERE r.rank > 1
        `, [DEFAULT_PHOTO]);

        if (mapping.length === 0) {
            console.log('Aucun doublon détecté. La base est propre.');
            return;
        }

        const groupCount = new Set(mapping.map(m => m.norm_name)).size;
        console.log(`Groupes de doublons : ${groupCount} | Enregistrements à fusionner : ${mapping.length}`);

        // Aperçu
        const preview = mapping.slice(0, 15);
        console.log('\nAperçu (15 premiers) :');
        for (const m of preview) {
            console.log(`  "${m.duplicate_name}" (id=${m.duplicate_id}) -> canonique (id=${m.canonical_id}) [${m.norm_name}]`);
        }

        if (DRY_RUN) {
            console.log(`\n[DRY-RUN] Aucune modification effectuée.`);
            console.log(`Relancer avec --execute pour appliquer.\n`);
            return;
        }

        // 2. Vérifier la colonne person dans player_season_xg
        const { rows: xgCols } = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'v4' AND table_name = 'player_season_xg'
        `);
        const xgPersonCol = xgCols.some(c => c.column_name === 'person_id') ? 'person_id' : 'player_id';

        await client.query('BEGIN');
        try {
            // 3. Créer une table temporaire pour le mapping
            console.log('\nCréation de la table temporaire de mapping...');
            await client.query(`CREATE TEMP TABLE _dedup_map (
                duplicate_id BIGINT PRIMARY KEY,
                canonical_id BIGINT NOT NULL
            ) ON COMMIT DROP`);

            // Insertion par batch de 5000
            const batchSize = 5000;
            for (let i = 0; i < mapping.length; i += batchSize) {
                const batch = mapping.slice(i, i + batchSize);
                const values = batch.map(m => `(${m.duplicate_id}, ${m.canonical_id})`).join(',');
                await client.query(`INSERT INTO _dedup_map (duplicate_id, canonical_id) VALUES ${values}`);
                console.log(`  Mapping inséré : ${Math.min(i + batchSize, mapping.length)} / ${mapping.length}`);
            }

            // 4. Updates en masse
            console.log('\nMise à jour match_lineups...');
            const r1 = await client.query(`
                UPDATE v4.match_lineups ml
                SET player_id = m.canonical_id
                FROM _dedup_map m
                WHERE ml.player_id = m.duplicate_id
            `);
            console.log(`  -> ${r1.rowCount} lignes`);

            console.log('Mise à jour match_events (player_id)...');
            const r2 = await client.query(`
                UPDATE v4.match_events me
                SET player_id = m.canonical_id
                FROM _dedup_map m
                WHERE me.player_id = m.duplicate_id
            `);
            console.log(`  -> ${r2.rowCount} lignes`);

            console.log('Mise à jour match_events (related_player_id)...');
            const r3 = await client.query(`
                UPDATE v4.match_events me
                SET related_player_id = m.canonical_id
                FROM _dedup_map m
                WHERE me.related_player_id = m.duplicate_id
            `);
            console.log(`  -> ${r3.rowCount} lignes`);

            console.log('Mise à jour matches (referee_person_id)...');
            const r4 = await client.query(`
                UPDATE v4.matches mt
                SET referee_person_id = m.canonical_id
                FROM _dedup_map m
                WHERE mt.referee_person_id = m.duplicate_id
            `);
            console.log(`  -> ${r4.rowCount} lignes`);

            // player_season_xg : supprimer les conflits d'abord
            console.log(`Suppression des conflits player_season_xg...`);
            const r5 = await client.query(`
                DELETE FROM v4.player_season_xg s2
                USING v4.player_season_xg s1
                JOIN _dedup_map m ON s1.${xgPersonCol} = m.canonical_id
                WHERE s2.${xgPersonCol} = m.duplicate_id
                  AND s1.competition_id = s2.competition_id
                  AND s1.season_label = s2.season_label
                  AND s1.club_id = s2.club_id
                  AND s1.player_name = s2.player_name
            `);
            console.log(`  -> ${r5.rowCount} conflits supprimés`);

            console.log(`Mise à jour player_season_xg (${xgPersonCol})...`);
            const r6 = await client.query(`
                UPDATE v4.player_season_xg xg
                SET ${xgPersonCol} = m.canonical_id
                FROM _dedup_map m
                WHERE xg.${xgPersonCol} = m.duplicate_id
            `);
            console.log(`  -> ${r6.rowCount} lignes`);

            // 5. Supprimer les doublons
            console.log('Suppression des enregistrements dupliqués...');
            const r7 = await client.query(`
                DELETE FROM v4.people p
                USING _dedup_map m
                WHERE p.person_id = m.duplicate_id
            `);
            console.log(`  -> ${r7.rowCount} supprimés`);

            await client.query('COMMIT');

            console.log('\n=== Rapport final ===');
            console.log(`Groupes fusionnés           : ${groupCount}`);
            console.log(`Enregistrements supprimés   : ${r7.rowCount}`);
            console.log(`match_lineups mis à jour     : ${r1.rowCount}`);
            console.log(`match_events (player)        : ${r2.rowCount}`);
            console.log(`match_events (related)       : ${r3.rowCount}`);
            console.log(`matches (arbitres)           : ${r4.rowCount}`);
            console.log(`player_season_xg conflits    : ${r5.rowCount}`);
            console.log(`player_season_xg mis à jour  : ${r6.rowCount}`);
            console.log('\nDédoublonnage terminé avec succès.\n');

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('ERREUR — transaction annulée :', err.message);
            throw err;
        }

    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Erreur fatale :', err);
    process.exit(1);
});
