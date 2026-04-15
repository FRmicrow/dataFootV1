/**
 * migrate_v3_photos_to_v4.js — Contextual hierarchical photo migration V3 → V4
 *
 * Stratégie : 4 niveaux de matching décroissants en SQL pur.
 * Utilise des TEMP TABLEs pour matérialiser les contextes une seule fois.
 *
 * Stage 1 : nom complet normalisé + club + saison       (certitude maximale)
 * Stage 2 : nom de famille + club + saison              (très haute confiance)
 * Stage 3 : nom de famille + club (toutes saisons)      (haute confiance)
 * Stage 4 : nom de famille + saison (tous clubs)        (confiance modérée)
 *
 * Usage :
 *   node scripts/v4/migrate_v3_photos_to_v4.js --dry-run
 *   node scripts/v4/migrate_v3_photos_to_v4.js --execute
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

const { Pool } = pg;
const DRY_RUN = !process.argv.includes('--execute');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://statfoot_user:statfoot_password@statfoot-db:5432/statfoot',
});

async function run() {
    const client = await pool.connect();
    try {
        console.log(`\n=== migrate_v3_photos_to_v4.js [${DRY_RUN ? 'DRY-RUN' : 'EXECUTE'}] ===\n`);

        // ── Matérialisation des contextes (TEMP TABLE = calcul unique) ─────────
        console.log('Création des tables de contexte...');

        // Contexte V4 : joueurs sans photo, avec club+saison
        await client.query(`
            CREATE TEMP TABLE _v4_ctx AS
            SELECT DISTINCT ON (p.person_id, club_norm, season_label)
                p.person_id,
                lower(regexp_replace(public.immutable_unaccent(p.full_name), '[^a-zA-Z0-9]', '', 'g'))
                    AS norm_full,
                lower(regexp_replace(public.immutable_unaccent(
                    CASE WHEN p.full_name LIKE '% %'
                    THEN substring(p.full_name FROM position(' ' IN p.full_name) + 1)
                    ELSE p.full_name END
                ), '[^a-zA-Z0-9]', '', 'g')) AS norm_surname,
                lower(regexp_replace(public.immutable_unaccent(c.name), '[^a-zA-Z0-9]', '', 'g'))
                    AS club_norm,
                m.season_label
            FROM v4.people p
            JOIN v4.match_lineups ml ON p.person_id = ml.player_id
            JOIN v4.matches m        ON ml.match_id  = m.match_id
            JOIN v4.clubs c          ON ml.club_id   = c.club_id
            WHERE p.person_type = 'player'
              AND (p.photo_url IS NULL OR p.photo_url = '')
            ORDER BY p.person_id, club_norm, season_label
        `);
        const { rows: [{ cnt4 }] } = await client.query('SELECT COUNT(DISTINCT person_id) cnt4 FROM _v4_ctx');
        console.log(`  V4 joueurs sans photo avec contexte : ${cnt4}`);

        // Contexte V3 : joueurs avec photo, extraits des lineups
        await client.query(`
            CREATE TEMP TABLE _v3_ctx AS
            SELECT DISTINCT ON (
                lower(regexp_replace(public.immutable_unaccent(t.name), '[^a-zA-Z0-9]', '', 'g')),
                f.season_year,
                lower(regexp_replace(public.immutable_unaccent(fl.player_name), '[^a-zA-Z0-9]', '', 'g'))
            )
                pl.photo_url,
                lower(regexp_replace(public.immutable_unaccent(fl.player_name), '[^a-zA-Z0-9]', '', 'g'))
                    AS norm_full,
                lower(regexp_replace(public.immutable_unaccent(
                    CASE WHEN fl.player_name ~ '^[A-Za-z]{1,3}\\. '
                    THEN regexp_replace(fl.player_name, '^[A-Za-z]{1,3}\\. +', '')
                    ELSE fl.player_name END
                ), '[^a-zA-Z0-9]', '', 'g')) AS norm_surname,
                lower(regexp_replace(public.immutable_unaccent(t.name), '[^a-zA-Z0-9]', '', 'g'))
                    AS club_norm,
                (f.season_year::text || '-' || (f.season_year + 1)::text) AS season_label
            FROM v3_fixture_lineup_players fl
            JOIN v3_players  pl ON fl.player_id  = pl.player_id
            JOIN v3_fixtures f  ON fl.fixture_id  = f.fixture_id
            JOIN v3_teams    t  ON fl.team_id     = t.team_id
            WHERE pl.photo_url IS NOT NULL AND pl.photo_url != ''
            ORDER BY
                lower(regexp_replace(public.immutable_unaccent(t.name), '[^a-zA-Z0-9]', '', 'g')),
                f.season_year,
                lower(regexp_replace(public.immutable_unaccent(fl.player_name), '[^a-zA-Z0-9]', '', 'g'))
        `);
        const { rows: [{ cnt3 }] } = await client.query('SELECT COUNT(*) cnt3 FROM _v3_ctx');
        console.log(`  V3 entrées lineup avec photo : ${cnt3}`);

        // Index sur les temp tables pour les jointures
        console.log('  Indexation des temp tables...');
        await client.query('CREATE INDEX ON _v4_ctx (norm_full, club_norm, season_label)');
        await client.query('CREATE INDEX ON _v4_ctx (norm_surname, club_norm, season_label)');
        await client.query('CREATE INDEX ON _v4_ctx (norm_surname, club_norm)');
        await client.query('CREATE INDEX ON _v4_ctx (norm_surname, season_label)');
        await client.query('CREATE INDEX ON _v3_ctx (norm_full, club_norm, season_label)');
        await client.query('CREATE INDEX ON _v3_ctx (norm_surname, club_norm, season_label)');
        await client.query('CREATE INDEX ON _v3_ctx (norm_surname, club_norm)');
        await client.query('CREATE INDEX ON _v3_ctx (norm_surname, season_label)');
        console.log('  OK\n');

        // ── Potentiel par stage ────────────────────────────────────────────────
        console.log('Analyse du potentiel par stage...');

        const countStage = async (joinCond) => {
            const { rows } = await client.query(`
                SELECT COUNT(DISTINCT v4.person_id) AS n
                FROM _v4_ctx v4 JOIN _v3_ctx v3 ON ${joinCond}
            `);
            return parseInt(rows[0].n);
        };

        const s1count = await countStage('v4.norm_full = v3.norm_full AND v4.club_norm = v3.club_norm AND v4.season_label = v3.season_label');
        const s2count = await countStage('v4.norm_surname = v3.norm_surname AND v4.club_norm = v3.club_norm AND v4.season_label = v3.season_label');
        const s3count = await countStage('v4.norm_surname = v3.norm_surname AND v4.club_norm = v3.club_norm');
        const s4count = await countStage('v4.norm_surname = v3.norm_surname AND v4.season_label = v3.season_label');

        // Les stages sont cumulatifs (s2 inclut s1, etc.) — afficher les incréments
        const total_missing = parseInt(cnt4);
        const total_matchable = s4count; // le plus large
        const pct = total_missing > 0 ? ((total_matchable / total_missing) * 100).toFixed(1) : 0;

        console.log(`Joueurs V4 sans photo     : ${total_missing}`);
        console.log(`Stage 1 (nom+club+sais)   : ${s1count} (certitude max)`);
        console.log(`Stage 2 (surnom+club+sais): ${s2count} (cumul, très haute conf.)`);
        console.log(`Stage 3 (surnom+club)     : ${s3count} (cumul, haute conf.)`);
        console.log(`Stage 4 (surnom+saison)   : ${s4count} (cumul, conf. modérée)`);
        console.log(`Couverture potentielle    : ${total_matchable} / ${total_missing} (${pct}%)`);

        if (DRY_RUN) {
            console.log('\n[DRY-RUN] Aucune modification. Relancer avec --execute.\n');
            return;
        }

        if (total_matchable === 0) {
            console.log('\nRien à migrer.\n');
            return;
        }

        // ── Exécution séquentielle ────────────────────────────────────────────
        const doUpdate = async (label, joinCond) => {
            const { rowCount } = await client.query(`
                WITH matches AS (
                    SELECT DISTINCT ON (v4.person_id) v4.person_id, v3.photo_url
                    FROM _v4_ctx v4
                    JOIN _v3_ctx v3 ON ${joinCond}
                    ORDER BY v4.person_id
                )
                UPDATE v4.people p
                SET photo_url = m.photo_url
                FROM matches m
                WHERE p.person_id = m.person_id
                  AND (p.photo_url IS NULL OR p.photo_url = '')
            `);
            console.log(`  ${label}: ${rowCount} photos mises à jour`);
            return rowCount;
        };

        console.log('\nMigration en cours...');
        const r1 = await doUpdate('[Stage 1] nom complet + club + saison',
            'v4.norm_full = v3.norm_full AND v4.club_norm = v3.club_norm AND v4.season_label = v3.season_label');

        // Reconstruire _v4_ctx pour exclure ceux déjà mis à jour
        await client.query('DROP TABLE IF EXISTS _v4_ctx');
        await client.query(`
            CREATE TEMP TABLE _v4_ctx AS
            SELECT DISTINCT ON (p.person_id, club_norm, season_label)
                p.person_id,
                lower(regexp_replace(public.immutable_unaccent(p.full_name), '[^a-zA-Z0-9]', '', 'g')) AS norm_full,
                lower(regexp_replace(public.immutable_unaccent(
                    CASE WHEN p.full_name LIKE '% %'
                    THEN substring(p.full_name FROM position(' ' IN p.full_name) + 1)
                    ELSE p.full_name END
                ), '[^a-zA-Z0-9]', '', 'g')) AS norm_surname,
                lower(regexp_replace(public.immutable_unaccent(c.name), '[^a-zA-Z0-9]', '', 'g')) AS club_norm,
                m.season_label
            FROM v4.people p
            JOIN v4.match_lineups ml ON p.person_id = ml.player_id
            JOIN v4.matches m        ON ml.match_id  = m.match_id
            JOIN v4.clubs c          ON ml.club_id   = c.club_id
            WHERE p.person_type = 'player'
              AND (p.photo_url IS NULL OR p.photo_url = '')
            ORDER BY p.person_id, club_norm, season_label
        `);
        await client.query('CREATE INDEX ON _v4_ctx (norm_surname, club_norm, season_label)');
        await client.query('CREATE INDEX ON _v4_ctx (norm_surname, club_norm)');
        await client.query('CREATE INDEX ON _v4_ctx (norm_surname, season_label)');

        const r2 = await doUpdate('[Stage 2] nom de famille + club + saison',
            'v4.norm_surname = v3.norm_surname AND v4.club_norm = v3.club_norm AND v4.season_label = v3.season_label');

        const r3 = await doUpdate('[Stage 3] nom de famille + club (ts saisons)',
            'v4.norm_surname = v3.norm_surname AND v4.club_norm = v3.club_norm');

        const r4 = await doUpdate('[Stage 4] nom de famille + saison (ts clubs)',
            'v4.norm_surname = v3.norm_surname AND v4.season_label = v3.season_label');

        // ── Bilan ─────────────────────────────────────────────────────────────
        const { rows: final } = await client.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '') AS with_photo,
                COUNT(*) FILTER (WHERE photo_url IS NULL OR photo_url = '') AS without_photo
            FROM v4.people WHERE person_type = 'player'
        `);
        const f = final[0];
        const totalAdded = r1 + r2 + r3 + r4;
        const coverage = ((f.with_photo / f.total) * 100).toFixed(1);

        console.log('\n=== Rapport final ===');
        console.log(`Total photos ajoutées : ${totalAdded}`);
        console.log(`Couverture finale     : ${f.with_photo} / ${f.total} (${coverage}%)`);
        console.log(`Reste sans photo      : ${f.without_photo}`);
        console.log('\nMigration terminée.\n');

    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Erreur fatale :', err);
    process.exit(1);
});
