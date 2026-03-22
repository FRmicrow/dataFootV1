#!/usr/bin/env node
/**
 * predict-upcoming-fixtures.js
 *
 * Génère les prédictions ML pour tous les matchs à venir (NS) sans prédiction.
 * Appelle GET /api/ml-platform/predict/fixture/:id pour chaque match manquant.
 *
 * NOTE: Les simulations ne traitent que les matchs terminés (backtesting).
 *       Ce script comble le gap pour les matchs futurs.
 *
 * Usage : node scripts/v3/predict-upcoming-fixtures.js
 *
 * Options :
 *   BACKEND_URL      (défaut: http://localhost:3001/api)
 *   CONCURRENCY      (défaut: 3 — appels en parallèle)
 *   SEASON_YEAR      (défaut: 2025)
 */

const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:3001/api';
const CONCURRENCY  = Number(process.env.CONCURRENCY || 3);
const SEASON_YEAR  = Number(process.env.SEASON_YEAR || 2025);

const COVERED_LEAGUES = [2, 11, 19, 15, 1, 34, 30, 32, 1475, 1476];

async function apiFetch(path, options = {}) {
    const url = `${BACKEND_URL}${path}`;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status} — ${text}`);
    }
    return res.json();
}

/** Récupère les matchs NS sans prédiction via l'API Foresight (avec retry si rate limited) */
async function fetchMissingFixtures() {
    const missing = [];
    for (const leagueId of COVERED_LEAGUES) {
        let retries = 3;
        while (retries > 0) {
            try {
                const data = await apiFetch(`/ml-platform/foresight/league/${leagueId}?seasonYear=${SEASON_YEAR}`);
                const fixtures = data?.data?.fixtures || [];
                const count = fixtures.filter((f) => f.predictionStatus === 'missing' || f.predictionStatus === 'partial').length;
                for (const f of fixtures) {
                    if (f.predictionStatus === 'missing' || f.predictionStatus === 'partial') {
                        missing.push({ fixtureId: f.fixtureId, leagueId, date: f.date, status: f.predictionStatus });
                    }
                }
                console.log(`  Ligue ${leagueId} → ${count} matchs manquants`);
                break;
            } catch (err) {
                if (err.message.includes('429') && retries > 1) {
                    retries--;
                    await new Promise((r) => setTimeout(r, 2000));
                } else {
                    console.warn(`  ⚠  Ligue ${leagueId} inaccessible : ${err.message}`);
                    break;
                }
            }
        }
        // Petite pause entre les ligues pour éviter le rate limit
        await new Promise((r) => setTimeout(r, 500));
    }
    return missing;
}

/** Prédit un fixture individuel */
async function predictFixture(fixtureId) {
    const data = await apiFetch(`/predict/fixture/${fixtureId}`);
    return data;
}

/** Exécute les prédictions avec une concurrence contrôlée */
async function runWithConcurrency(tasks, concurrency, onResult) {
    let index = 0;

    async function worker() {
        while (index < tasks.length) {
            const current = index++;
            const task = tasks[current];
            try {
                const result = await predictFixture(task.fixtureId);
                onResult({ task, result, error: null, index: current, total: tasks.length });
            } catch (err) {
                onResult({ task, result: null, error: err, index: current, total: tasks.length });
            }
        }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));
}

async function main() {
    console.log(`\n╔══════════════════════════════════════════════════════╗`);
    console.log(`║  Predict Upcoming Fixtures — Saison ${SEASON_YEAR}            ║`);
    console.log(`║  Concurrence : ${String(CONCURRENCY).padEnd(36)} ║`);
    console.log(`╚══════════════════════════════════════════════════════╝\n`);

    // Phase 1 — Identifier les matchs sans prédiction
    console.log('── Phase 1 : Identification des matchs manquants ──\n');
    const missing = await fetchMissingFixtures();

    if (!missing.length) {
        console.log('  ✓ Tous les matchs à venir ont déjà des prédictions.\n');
        return;
    }

    console.log(`  → ${missing.length} matchs sans prédiction complète trouvés\n`);

    // Phase 2 — Prédire en masse
    console.log(`── Phase 2 : Génération des prédictions (${CONCURRENCY} en parallèle) ──\n`);

    let success = 0;
    let failed  = 0;
    const errors = [];

    const startTime = Date.now();

    await runWithConcurrency(missing, CONCURRENCY, ({ task, result, error, index, total }) => {
        const pct = Math.round((index + 1) / total * 100);
        const bar = '[' + '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5)) + ']';

        if (error) {
            failed++;
            errors.push({ fixtureId: task.fixtureId, reason: error.message });
            process.stdout.write(`\r  ${bar} ${pct}%  ✗ ${task.fixtureId}          `);
        } else if (result?.success === false) {
            failed++;
            errors.push({ fixtureId: task.fixtureId, reason: result.message || 'unknown' });
            process.stdout.write(`\r  ${bar} ${pct}%  ~ ${task.fixtureId}          `);
        } else {
            success++;
            process.stdout.write(`\r  ${bar} ${pct}%  ✓ ${task.fixtureId}          `);
        }
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n`);

    // Rapport final
    console.log(`╔══════════════════════════════════════════════════════╗`);
    console.log(`║  Rapport final (${elapsed}s)${''.padEnd(35 - elapsed.length)}║`);
    console.log(`╠══════════════════════════════════════════════════════╣`);
    console.log(`║  ✓ Prédictions générées  : ${String(success).padEnd(25)}║`);
    console.log(`║  ✗ Échecs                : ${String(failed).padEnd(25)}║`);
    if (errors.length) {
        console.log(`╠══════════════════════════════════════════════════════╣`);
        for (const e of errors.slice(0, 10)) {
            const line = `fixture ${e.fixtureId} — ${e.reason}`;
            console.log(`║  ${line.slice(0, 50).padEnd(50)}  ║`);
        }
        if (errors.length > 10) {
            console.log(`║  ... et ${errors.length - 10} autres erreurs${''.padEnd(33 - String(errors.length - 10).length)}║`);
        }
    }
    console.log(`╚══════════════════════════════════════════════════════╝\n`);

    if (success > 0) {
        console.log(`  → Les prédictions sont maintenant disponibles dans MLForesightHub.\n`);
    }
}

main().catch((err) => {
    console.error(`\n  ✗ Erreur fatale : ${err.message}\n`);
    process.exit(1);
});
