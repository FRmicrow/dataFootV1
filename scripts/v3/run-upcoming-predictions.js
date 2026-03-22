#!/usr/bin/env node
/**
 * run-upcoming-predictions.js
 *
 * Lance les simulations ML manquantes pour toutes les ligues couvertes
 * de la saison courante, afin d'avoir des prédictions pour tous les
 * matchs à venir dans MLForesightHub.
 *
 * Usage : node scripts/v3/run-upcoming-predictions.js
 *
 * Options d'environnement :
 *   BACKEND_URL   (défaut: http://localhost:3001/api)
 *   SEASON_YEAR   (défaut: 2025)
 *   HORIZON       (défaut: FULL_HISTORICAL)
 */

const BACKEND_URL  = process.env.BACKEND_URL  || 'http://localhost:3001/api';
const SEASON_YEAR  = Number(process.env.SEASON_YEAR || 2025);
const HORIZON      = process.env.HORIZON      || 'FULL_HISTORICAL';
const POLL_INTERVAL_MS = 10_000; // 10 secondes

// ─── Ligues couvertes (V36_LEAGUE_PROFILES) ──────────────────────────────────

const COVERED_LEAGUES = [
    { id: 2,    name: 'Premier League'     },
    { id: 11,   name: 'La Liga'            },
    { id: 19,   name: 'Bundesliga'         },
    { id: 15,   name: 'Serie A'            },
    { id: 1,    name: 'Ligue 1'            },
    { id: 34,   name: 'Primeira Liga'      },
    { id: 30,   name: 'Eredivisie'         },
    { id: 32,   name: 'Belgian Pro League' },
    { id: 1475, name: 'UEFA Champions Lge' },
    { id: 1476, name: 'UEFA Europa Lge'    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const tag = (name) => name.padEnd(22);

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

async function checkReadiness(leagueId) {
    try {
        const data = await apiFetch(`/simulation/readiness?leagueId=${leagueId}&seasonYear=${SEASON_YEAR}`);
        return data?.data ?? null;
    } catch {
        return null;
    }
}

async function checkStatus(leagueId, simId) {
    try {
        const data = await apiFetch(`/simulation/status?leagueId=${leagueId}&seasonYear=${SEASON_YEAR}&simId=${simId}`);
        return data?.data ?? null;
    } catch {
        return null;
    }
}

async function launchSimulation(leagueId) {
    const data = await apiFetch('/simulation/start', {
        method: 'POST',
        body: JSON.stringify({ leagueId, seasonYear: SEASON_YEAR, horizon: HORIZON }),
    });
    return data?.data?.simulation_id ?? null;
}

function fmt(status) {
    if (!status) return '—';
    const pct = status.progress != null ? ` ${String(Math.round(status.progress)).padStart(3)}%` : '';
    return `${status.status}${pct}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n╔══════════════════════════════════════════════════════╗`);
    console.log(`║  Run Upcoming Predictions — Saison ${SEASON_YEAR}             ║`);
    console.log(`║  Horizon: ${HORIZON.padEnd(40)} ║`);
    console.log(`╚══════════════════════════════════════════════════════╝\n`);

    // Phase 1 — Vérification de la disponibilité de chaque ligue
    console.log('── Phase 1 : Vérification de la disponibilité ──\n');
    const pending = [];   // { league, simId }
    const skipped = [];

    for (const league of COVERED_LEAGUES) {
        process.stdout.write(`  ${tag(league.name)} → vérification…`);
        const ready = await checkReadiness(league.id);

        if (!ready) {
            console.log(` ✗ Ligue inaccessible (backend indisponible?)`);
            skipped.push({ league, reason: 'inaccessible' });
            continue;
        }

        if (ready.status !== 'READY') {
            console.log(` ✗ Pas prête : ${ready.message || ready.status}`);
            skipped.push({ league, reason: ready.message || ready.status });
            continue;
        }

        console.log(` ✓ READY  (${ready.feature_coverage ?? '?'} features · ${ready.total_fixtures ?? '?'} fixtures)`);
        pending.push({ league, simId: null });
    }

    if (!pending.length) {
        console.log('\n  ⚠  Aucune ligue disponible pour le lancement.\n');
        return;
    }

    // Phase 2 — Lancement des simulations
    console.log(`\n── Phase 2 : Lancement (${pending.length} ligues) ──\n`);

    for (const entry of pending) {
        process.stdout.write(`  ${tag(entry.league.name)} → lancement…`);
        try {
            const simId = await launchSimulation(entry.league.id);
            if (simId) {
                entry.simId = simId;
                console.log(` ✓ Simulation #${simId} démarrée`);
            } else {
                console.log(` ✗ Échec du lancement (pas de simId retourné)`);
                skipped.push({ league: entry.league, reason: 'lancement échoué' });
                entry.failed = true;
            }
        } catch (err) {
            // Simulation déjà en cours = cas normal, on l'attend quand même
            if (err.message?.includes('already') || err.message?.includes('409')) {
                console.log(` ~ Déjà en cours, surveillance activée`);
            } else {
                console.log(` ✗ Erreur : ${err.message}`);
                skipped.push({ league: entry.league, reason: err.message });
                entry.failed = true;
            }
        }
    }

    const active = pending.filter((e) => !e.failed);
    if (!active.length) {
        console.log('\n  ✗ Aucune simulation lancée avec succès.\n');
        return;
    }

    // Phase 3 — Polling jusqu'à completion
    console.log(`\n── Phase 3 : Surveillance (intervalle ${POLL_INTERVAL_MS / 1000}s) ──\n`);

    const done    = new Set();
    const failed  = new Set();

    while (done.size + failed.size < active.length) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const ts = new Date().toLocaleTimeString('fr-FR');
        process.stdout.write(`  [${ts}]`);

        for (const entry of active) {
            if (done.has(entry.league.id) || failed.has(entry.league.id)) continue;

            const status = await checkStatus(entry.league.id, entry.simId);
            const s = status?.status;

            if (s === 'COMPLETE' || s === 'COMPLETED') {
                done.add(entry.league.id);
                process.stdout.write(`  ✓ ${entry.league.name}`);
            } else if (s === 'FAILED') {
                failed.add(entry.league.id);
                process.stdout.write(`  ✗ ${entry.league.name}`);
            } else {
                process.stdout.write(`  ${entry.league.name} ${fmt(status)}`);
            }
        }
        console.log();
    }

    // Rapport final
    console.log(`\n╔══════════════════════════════════════════════════════╗`);
    console.log(`║  Rapport final                                       ║`);
    console.log(`╠══════════════════════════════════════════════════════╣`);
    console.log(`║  ✓ Terminées avec succès : ${String(done.size).padEnd(25)}║`);
    console.log(`║  ✗ Échouées              : ${String(failed.size).padEnd(25)}║`);
    console.log(`║  ~ Ignorées              : ${String(skipped.length).padEnd(25)}║`);
    if (skipped.length) {
        console.log(`╠══════════════════════════════════════════════════════╣`);
        for (const s of skipped) {
            const line = `${s.league.name} — ${s.reason}`;
            console.log(`║  ${line.slice(0, 50).padEnd(50)}  ║`);
        }
    }
    console.log(`╚══════════════════════════════════════════════════════╝\n`);

    if (done.size > 0) {
        console.log('  → Les prédictions sont maintenant disponibles dans MLForesightHub.\n');
    }
}

main().catch((err) => {
    console.error(`\n  ✗ Erreur fatale : ${err.message}\n`);
    process.exit(1);
});
