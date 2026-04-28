#!/usr/bin/env python3
"""
verify-run.py

Vérifie l'état des données scrapées en DB pour une période donnée.
Retourne un rapport sur les matchs complets / incomplets par compétition.

Usage:
    python3 verify-run.py [--since=2026-04-01] [--league=PremierLeague] [--json]
"""

import sys
import os
import json
import argparse
from datetime import datetime, timedelta
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
import importlib.util

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../'))
load_dotenv(os.path.join(_PROJECT_ROOT, 'backend', '.env'))

# Import FLASHSCORE_LEAGUES + FLASHSCORE_CUPS + resolve_league_key from main scraper
_spec = importlib.util.spec_from_file_location(
    'scraper', os.path.join(os.path.dirname(__file__), 'scrape-flashscore-results.py')
)
_scraper = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_scraper)

FLASHSCORE_LEAGUES = _scraper.FLASHSCORE_LEAGUES
FLASHSCORE_CUPS    = _scraper.FLASHSCORE_CUPS
resolve_league_key = _scraper.resolve_league_key
COMPETITION_NAME_MAP = _scraper.COMPETITION_NAME_MAP

# All competition names supported (leagues + cups)
_ALL_SUPPORTED_NAMES = set(COMPETITION_NAME_MAP.values()) | set(FLASHSCORE_LEAGUES.keys()) | set(FLASHSCORE_CUPS.keys())


def get_db():
    url = os.environ.get('DATABASE_URL',
          'postgresql://statfoot_user:statfoot_password@localhost:5432/statfoot')
    return psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)


def build_target_list(conn, since: str, league_filter: str = None) -> list:
    """
    Retourne tous les matchs scorés des compétitions supportées.
    expected_tier : 1 (Full) si la compétition avait déjà des events en DB avant ce run,
                    2 (Score only) sinon.
    """
    cur = conn.cursor()
    sql = """
        SELECT
            m.match_id,
            (m.match_date AT TIME ZONE 'Europe/Paris')::date::text AS match_date,
            h.name  AS home_team,
            a.name  AS away_team,
            c.name  AS competition_name,
            m.home_score,
            m.away_score,
            m.scraped_score_at,
            m.scraped_stats_at,
            m.scraped_events_at,
            m.scraped_lineups_at
        FROM v4.matches m
        JOIN v4.clubs        h ON h.club_id        = m.home_club_id
        JOIN v4.clubs        a ON a.club_id        = m.away_club_id
        JOIN v4.competitions c ON c.competition_id = m.competition_id
        WHERE m.home_score IS NOT NULL
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date >= %s::date
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date < CURRENT_DATE
        ORDER BY c.name, m.match_date
    """
    params = [since]
    cur.execute(sql, params)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()

    results = []
    for r in rows:
        key = resolve_league_key(r['competition_name'])
        if not key:
            continue
        if league_filter and league_filter.lower() not in key.lower():
            continue

        # Determine expected tier: Tier 1 if competition has events in DB this run
        # (scraped_events_at set = attempted), Tier 2 otherwise.
        # We use scraped_events_at on THIS match as proxy: if any match in this
        # competition has scraped_events_at set, competition is Tier 1.
        # We'll resolve tier per-competition below.
        results.append({**r, 'league_key': key})

    # Resolve tier per competition: Tier 1 if ≥1 match in competition has scraped_events_at
    comp_tier = {}
    for r in results:
        comp = r['competition_name']
        if comp not in comp_tier:
            comp_tier[comp] = 2
        if r['scraped_events_at'] is not None:
            comp_tier[comp] = 1

    for r in results:
        r['expected_tier'] = comp_tier[r['competition_name']]

    return results


def check_completeness(row: dict) -> dict:
    """
    Détermine si un match est complet selon son tier attendu.
    Returns: augmented row with 'complete' and 'missing' fields.
    """
    tier = row['expected_tier']
    missing = []

    if row['home_score'] is None:
        missing.append('score')

    if tier == 1:
        if row['scraped_stats_at'] is None:
            missing.append('stats')
        if row['scraped_events_at'] is None:
            missing.append('events')
        if row['scraped_lineups_at'] is None:
            missing.append('lineups')

    return {**row, 'complete': len(missing) == 0, 'missing': missing}


def verify_all(since: str, league_filter: str = None) -> dict:
    """Vérifie tous les matchs cibles et retourne un rapport structuré."""
    conn = get_db()
    targets = build_target_list(conn, since, league_filter)
    conn.close()

    checked = [check_completeness(r) for r in targets]

    complete   = [r for r in checked if r['complete']]
    incomplete = [r for r in checked if not r['complete']]

    by_competition = {}
    for r in checked:
        comp = r['competition_name']
        if comp not in by_competition:
            by_competition[comp] = {'total': 0, 'complete': 0, 'incomplete': 0,
                                     'tier': r['expected_tier']}
        by_competition[comp]['total'] += 1
        if r['complete']:
            by_competition[comp]['complete'] += 1
        else:
            by_competition[comp]['incomplete'] += 1

    return {
        'since': since,
        'total': len(checked),
        'complete': len(complete),
        'incomplete_count': len(incomplete),
        'incomplete': incomplete,
        'by_competition': by_competition,
    }


def print_report(report: dict, file=sys.stderr):
    print(f"\n{'='*60}", file=file)
    print(f"  FLASHSCORE VERIFICATION REPORT — since {report['since']}", file=file)
    print(f"{'='*60}", file=file)
    print(f"  Total matchs cibles : {report['total']}", file=file)
    print(f"  Complets            : {report['complete']}", file=file)
    print(f"  Incomplets          : {report['incomplete_count']}", file=file)

    if report['by_competition']:
        print(f"\n  Par compétition :", file=file)
        for comp, stats in sorted(report['by_competition'].items()):
            tier_label = f"T{stats['tier']}"
            status = "OK" if stats['incomplete'] == 0 else f"{stats['incomplete']} manquants"
            print(f"    {tier_label}  {comp:35s}  {stats['complete']}/{stats['total']}  {status}", file=file)

    if report['incomplete']:
        print(f"\n  Matchs incomplets :", file=file)
        for r in report['incomplete'][:50]:  # cap to 50 for readability
            print(f"    [{r['match_date']}] {r['home_team']} vs {r['away_team']}"
                  f"  ({r['competition_name']})  manquant: {', '.join(r['missing'])}", file=file)
        if len(report['incomplete']) > 50:
            print(f"    ... et {len(report['incomplete']) - 50} autres", file=file)

    print(f"{'='*60}\n", file=file)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--since', default=None)
    parser.add_argument('--league', default=None)
    parser.add_argument('--json', action='store_true', help='Output JSON to stdout')
    args = parser.parse_args()

    since = args.since or (datetime.now() - timedelta(days=15)).strftime('%Y-%m-%d')
    report = verify_all(since, args.league)

    if args.json:
        # Serialize datetimes for JSON output
        def _clean(obj):
            if isinstance(obj, dict):
                return {k: _clean(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [_clean(v) for v in obj]
            if hasattr(obj, 'isoformat'):
                return obj.isoformat()
            return obj
        print(json.dumps(_clean(report), indent=2))
    else:
        print_report(report, file=sys.stdout)

    if report['incomplete_count'] > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
