#!/usr/bin/env python3
"""
run-scraper.py

Orchestrateur infaillible du skill flashscore-scraper.

Flux :
  1. Vérifier l'état actuel en DB (via verify-run.py)
  2. repair_empty_markers — reset des marqueurs posés sans données réelles
  3. Lancer scrape-flashscore-results.py sur les matchs incomplets
  4. Écrire en DB via update-match-results.js
  5. Revérifier et reboucler jusqu'à MAX_RETRIES tentatives
  6. resolve_lineup_player_ids — résoudre les player_id NULL dans match_lineups
  7. Rapport final

Usage:
    python3 run-scraper.py [--since=2026-04-01] [--league=PremierLeague]
                           [--mode=update|discover|all] [--force-tier=1]
                           [--max-retries=3] [--dry-run] [--mark-unreachable]
"""

import sys
import os
import subprocess
import argparse
from datetime import datetime, timedelta
import importlib.util

_SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.abspath(os.path.join(_SCRIPT_DIR, '../../../../'))
_BACKEND_DIR  = os.path.join(_PROJECT_ROOT, 'backend')
_SCRAPER_PY   = os.path.join(_SCRIPT_DIR, 'scrape-flashscore-results.py')
_WRITER_JS    = os.path.join(_SCRIPT_DIR, 'update-match-results.js')

# Import verify helpers
_spec = importlib.util.spec_from_file_location(
    'verify', os.path.join(_SCRIPT_DIR, 'verify-run.py')
)
_verify = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_verify)

verify_all   = _verify.verify_all
print_report = _verify.print_report


def log(msg: str):
    print(msg, file=sys.stderr, flush=True)


def run_scraper(since: str, mode: str, league: str, force_tier: int,
                match_ids: list, dry_run: bool) -> int:
    """
    Lance le scraper Python → writer JS en pipeline.
    Si match_ids fourni, passe --match-ids pour cibler précisément les matchs à retry.
    Returns: exit code du pipeline (0 = succès).
    """
    cmd_py = [sys.executable, _SCRAPER_PY, f'--mode={mode}', f'--since={since}']
    if league:
        cmd_py.append(f'--league={league}')
    if force_tier == 1:
        cmd_py.append('--force-tier=1')
    if match_ids:
        cmd_py.append(f'--match-ids={",".join(str(m) for m in match_ids)}')
    if dry_run:
        cmd_py.append('--dry-run')

    cmd_js = ['node', _WRITER_JS]
    if dry_run:
        cmd_js.append('--dry-run')

    log(f"  CMD: {' '.join(cmd_py)}")

    if dry_run:
        # In dry-run, just run the scraper and discard output (no writer)
        result = subprocess.run(cmd_py, cwd=_BACKEND_DIR)
        return result.returncode

    py_proc  = subprocess.Popen(cmd_py, stdout=subprocess.PIPE, stderr=sys.stderr,
                                 cwd=_BACKEND_DIR)
    js_proc  = subprocess.Popen(cmd_js, stdin=py_proc.stdout, stderr=sys.stderr,
                                 cwd=_BACKEND_DIR)
    py_proc.stdout.close()
    js_proc.communicate()
    py_proc.wait()

    # Return non-zero if either process failed
    if py_proc.returncode != 0:
        return py_proc.returncode
    return js_proc.returncode


def _get_db_conn():
    import psycopg2
    from dotenv import load_dotenv
    _root = os.path.abspath(os.path.join(_SCRIPT_DIR, '../../../../'))
    load_dotenv(os.path.join(_root, 'backend', '.env'))
    db_url = os.environ.get('DATABASE_URL',
             'postgresql://statfoot_user:statfoot_password@localhost:5432/statfoot')
    return psycopg2.connect(db_url)


def repair_empty_markers(since: str, dry_run: bool):
    """
    Réinitialise les marqueurs scraped_*_at posés mais sans données réelles en DB.
    Cas typique : scraper a navigué sur la page lineups/events mais a extrait 0 rows
    à cause d'un DOM non chargé, puis a posé le marqueur quand même.

    Fix : NULL les marqueurs sur les matchs où le marker est posé mais 0 rows en table.
    Le prochain run retente proprement.
    """
    if dry_run:
        log("  [repair] dry-run — skip repair_empty_markers")
        return 0

    conn = _get_db_conn()
    cur = conn.cursor()

    # Reset scraped_lineups_at where marker set but 0 rows in match_lineups
    cur.execute("""
        UPDATE v4.matches m
        SET scraped_lineups_at = NULL
        WHERE m.scraped_lineups_at IS NOT NULL
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date >= %s::date
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date < CURRENT_DATE
          AND NOT EXISTS (
              SELECT 1 FROM v4.match_lineups ml WHERE ml.match_id = m.match_id
          )
    """, [since])
    lineups_reset = cur.rowcount

    # Reset scraped_events_at where marker set but 0 rows in match_events
    # (only if match HAS events in reality — i.e. has a score, not 0-0 where no events is normal)
    # We reset if no events AND the match had goals (home_score + away_score > 0)
    cur.execute("""
        UPDATE v4.matches m
        SET scraped_events_at = NULL
        WHERE m.scraped_events_at IS NOT NULL
          AND (m.home_score + m.away_score) > 0
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date >= %s::date
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date < CURRENT_DATE
          AND NOT EXISTS (
              SELECT 1 FROM v4.match_events me WHERE me.match_id = m.match_id
          )
    """, [since])
    events_reset = cur.rowcount

    conn.commit()
    cur.close()
    conn.close()

    if lineups_reset or events_reset:
        log(f"  [repair] markers reset: {lineups_reset} lineups, {events_reset} events")
    return lineups_reset + events_reset


def resolve_lineup_player_ids(since: str, dry_run: bool):
    """
    Résout rétrospectivement les player_id NULL dans match_lineups.
    Flashscore affiche des noms abrégés (ex: "Akpoguma K.", "Musiala") qui ne matchent
    pas directement le full_name dans v4.people. Cette fonction applique 3 stratégies :
      1. Exact ILIKE match
      2. "Lastname I." → word-boundary regex + initiale
      3. Mot unique → last-name lookup ("% Musiala")
    """
    import re as _re
    if dry_run:
        log("  [resolve] dry-run — skip resolve_lineup_player_ids")
        return 0

    conn = _get_db_conn()
    cur = conn.cursor()

    # Collect distinct unresolved names for the period
    cur.execute("""
        SELECT DISTINCT ml.player_name
        FROM v4.match_lineups ml
        JOIN v4.matches m ON m.match_id = ml.match_id
        WHERE ml.player_id IS NULL
          AND ml.player_name IS NOT NULL
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date >= %s::date
    """, [since])
    names = [r[0] for r in cur.fetchall()]

    if not names:
        conn.close()
        return 0

    resolved_map = {}
    for name in names:
        # 1. Exact
        cur.execute(
            "SELECT person_id::text FROM v4.people WHERE full_name ILIKE %s LIMIT 1",
            [name]
        )
        row = cur.fetchone()
        if row:
            resolved_map[name] = row[0]
            continue

        # 2. "Lastname I." with word boundary
        m = _re.match(r'^(.+?)\s+([A-Z])\.$', name)
        if m:
            last, initial = m.group(1), m.group(2)
            cur.execute("""
                SELECT person_id::text FROM v4.people
                WHERE (full_name ILIKE %s OR full_name ILIKE %s)
                  AND full_name ~* %s
                LIMIT 1
            """, [f'{initial}% {last}', f'{initial}% {last} %',
                  f'(^|\\s){_re.escape(last)}(\\s|$)'])
            row = cur.fetchone()
            if row:
                resolved_map[name] = row[0]
                continue

        # 3. Single word as last-name component
        if ' ' not in name:
            cur.execute(
                "SELECT person_id::text FROM v4.people WHERE full_name ILIKE %s LIMIT 1",
                [f'% {name}']
            )
            row = cur.fetchone()
            if row:
                resolved_map[name] = row[0]

    # Bulk UPDATE
    updated = 0
    for name, person_id in resolved_map.items():
        cur.execute("""
            UPDATE v4.match_lineups ml
            SET player_id = %s
            FROM v4.matches m
            WHERE ml.match_id = m.match_id
              AND ml.player_id IS NULL
              AND ml.player_name ILIKE %s
              AND (m.match_date AT TIME ZONE 'Europe/Paris')::date >= %s::date
        """, [person_id, name, since])
        updated += cur.rowcount

    conn.commit()
    cur.close()
    conn.close()

    log(f"  [resolve] {len(resolved_map)}/{len(names)} noms résolus → {updated} lignes mises à jour")
    return updated


def mark_unreachable(incomplete: list, dry_run: bool):
    """
    Marque les matchs persistants comme 'attempted' en posant les marqueurs manquants.
    Utilisé après épuisement des retries pour les matchs introuvables sur Flashscore
    (ex: matchs d'une mauvaise compétition en DB, noms d'équipes non matchables).

    Le marqueur scraped_events_at = NOW() indique "tenté, ne pas retenter".
    """
    if dry_run:
        log(f"  [dry-run] {len(incomplete)} matchs seraient marqués unreachable")
        return

    import psycopg2
    from dotenv import load_dotenv
    _root = os.path.abspath(os.path.join(_SCRIPT_DIR, '../../../../'))
    load_dotenv(os.path.join(_root, 'backend', '.env'))

    db_url = os.environ.get('DATABASE_URL',
             'postgresql://statfoot_user:statfoot_password@localhost:5432/statfoot')
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    marked = 0
    for r in incomplete:
        # Only mark matches that have a score but are missing detail markers
        # (not matches missing the score itself — those are genuine scraping failures)
        if 'score' in r['missing']:
            continue
        missing = r['missing']
        sets = []
        if 'stats' in missing:
            sets.append('scraped_stats_at = NOW()')
        if 'events' in missing:
            sets.append('scraped_events_at = NOW()')
        if 'lineups' in missing:
            sets.append('scraped_lineups_at = NOW()')
        if not sets:
            continue
        sql = f"UPDATE v4.matches SET {', '.join(sets)} WHERE match_id = %s"
        cur.execute(sql, [r['match_id']])
        log(f"  [unreachable] match {r['match_id']} ({r['home_team']} vs {r['away_team']}) — marqué done")
        marked += 1

    conn.commit()
    cur.close()
    conn.close()
    log(f"  {marked} matchs marqués comme unreachable.")


def main():
    parser = argparse.ArgumentParser(description='Flashscore scraper orchestrator with verification loop')
    parser.add_argument('--since', default=None, help='Lookback start date (default: J-15)')
    parser.add_argument('--league', default=None, help='Filter to a specific competition key')
    parser.add_argument('--mode', default='update', choices=['update', 'discover', 'all'])
    parser.add_argument('--force-tier', type=int, default=1, choices=[0, 1],
                        help='Force tier 1 (Full) for all competitions (default: 1)')
    parser.add_argument('--max-retries', type=int, default=3)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--mark-unreachable', action='store_true',
                        help='After max retries, mark persistent incomplete matches as done')
    args = parser.parse_args()

    since = args.since or (datetime.now() - timedelta(days=15)).strftime('%Y-%m-%d')

    log(f"\n{'='*60}")
    log(f"  FLASHSCORE ORCHESTRATOR")
    log(f"  mode={args.mode}  since={since}  force-tier={args.force_tier}  max-retries={args.max_retries}")
    log(f"{'='*60}")

    for attempt in range(1, args.max_retries + 1):
        log(f"\n--- Vérification état DB (tentative {attempt}/{args.max_retries}) ---")
        # Repair markers posés sans données réelles avant de vérifier
        repair_empty_markers(since, args.dry_run)
        report = verify_all(since, args.league)
        print_report(report, file=sys.stderr)

        if report['incomplete_count'] == 0:
            log(f"✓ Tous les {report['total']} matchs sont complets.")
            log(f"\n--- Résolution des player_id manquants dans les lineups ---")
            resolve_lineup_player_ids(since, args.dry_run)
            log(f"Done.")
            sys.exit(0)

        incomplete = report['incomplete']
        log(f"  {len(incomplete)} matchs incomplets — lancement du scraper...")

        # Build match_ids for targeted retry
        match_ids = []
        if args.mode in ('update',):
            match_ids = [r['match_id'] for r in incomplete
                         if 'score' not in r['missing']]  # already scored, just missing detail

        rc = run_scraper(
            since=since,
            mode=args.mode,
            league=args.league,
            force_tier=args.force_tier,
            match_ids=match_ids,
            dry_run=args.dry_run,
        )
        if rc != 0:
            log(f"  WARN: scraper exited with code {rc}")

    # Final check after all retries
    log(f"\n--- Vérification finale après {args.max_retries} tentatives ---")
    final_report = verify_all(since, args.league)
    print_report(final_report, file=sys.stderr)

    if final_report['incomplete_count'] > 0:
        log(f"ERREUR: {final_report['incomplete_count']} matchs toujours incomplets après {args.max_retries} tentatives.")
        log(f"  Matchs persistants :")
        for r in final_report['incomplete']:
            log(f"    [{r['match_date']}] {r['home_team']} vs {r['away_team']}"
                f"  ({r['competition_name']})  manquant: {', '.join(r['missing'])}")

        if args.mark_unreachable:
            log(f"\n  --mark-unreachable activé : pose des marqueurs sur les matchs persistants...")
            mark_unreachable(final_report['incomplete'], args.dry_run)
            log(f"  Ces matchs ne seront plus retentés lors des prochains runs.")
        else:
            sys.exit(1)

    # Resolve player_id NULL in match_lineups (abbreviated names from Flashscore)
    log(f"\n--- Résolution des player_id manquants dans les lineups ---")
    resolve_lineup_player_ids(since, args.dry_run)

    log(f"✓ Tous les matchs sont complets (ou marqués unreachable).")
    sys.exit(0)


if __name__ == '__main__':
    main()
