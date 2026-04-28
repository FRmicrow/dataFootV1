#!/usr/bin/env python3
"""
backfill-match-stats.py

Scrapes and inserts match_stats for matches that already have a score in v4.matches
but have no entry in v4.match_stats.

Usage:
    python3 backfill-match-stats.py [--league=SerieA] [--since=2026-04-01] [--dry-run]
"""

import sys
import os
import re
import hashlib
import argparse
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../'))
load_dotenv(os.path.join(_PROJECT_ROOT, 'backend', '.env'))

# Import helpers from the main scraper
import importlib.util
_spec = importlib.util.spec_from_file_location(
    'scraper', os.path.join(os.path.dirname(__file__), 'scrape-flashscore-results.py')
)
_scraper = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_scraper)

# Re-export needed symbols
normalize         = _scraper.normalize
teams_match       = _scraper.teams_match
parse_result_row  = _scraper.parse_result_row
load_results_page = _scraper.load_results_page
scrape_match_detail = _scraper.scrape_match_detail
dismiss_popups    = _scraper.dismiss_popups
FLASHSCORE_LEAGUES = _scraper.FLASHSCORE_LEAGUES
COMPETITION_NAME_MAP = _scraper.COMPETITION_NAME_MAP
resolve_league_key = _scraper.resolve_league_key

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_event_id(match_id: int, event_order: int) -> int:
    """Deterministic signed BIGINT ID for a match event (idempotent upsert)."""
    raw = f"ev_{match_id}_{event_order}"
    return int(hashlib.sha256(raw.encode()).hexdigest()[:15], 16)


# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------

def get_db():
    url = os.environ.get('DATABASE_URL',
          'postgresql://statfoot_user:statfoot_password@localhost:5432/statfoot')
    return psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)


def fetch_scored_without_stats(conn, league_filter, since):
    cur = conn.cursor()
    sql = """
        SELECT m.match_id, m.match_date::text, h.name AS home_team,
               a.name AS away_team, c.name AS competition_name,
               m.home_club_id, m.away_club_id
        FROM v4.matches m
        JOIN v4.clubs h ON h.club_id = m.home_club_id
        JOIN v4.clubs a ON a.club_id = m.away_club_id
        JOIN v4.competitions c ON c.competition_id = m.competition_id
        WHERE m.home_score IS NOT NULL
          AND m.scraped_stats_at IS NULL
          AND m.match_date >= %s::date
          AND m.match_date < CURRENT_DATE
    """
    params = [since]
    if league_filter:
        sql += " AND c.name ILIKE %s"
        params.append(f'%{league_filter}%')
    sql += " ORDER BY c.name, m.match_date"
    cur.execute(sql, params)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    return rows


def fetch_scored_without_lineups(conn, league_filter, since):
    """Return scored matches that have not yet had lineups scraped (by marker)."""
    cur = conn.cursor()
    sql = """
        SELECT m.match_id, m.match_date::text, h.name AS home_team,
               a.name AS away_team, c.name AS competition_name,
               m.home_club_id, m.away_club_id
        FROM v4.matches m
        JOIN v4.clubs h ON h.club_id = m.home_club_id
        JOIN v4.clubs a ON a.club_id = m.away_club_id
        JOIN v4.competitions c ON c.competition_id = m.competition_id
        WHERE m.home_score IS NOT NULL
          AND m.scraped_lineups_at IS NULL
          AND m.match_date >= %s::date
          AND m.match_date < CURRENT_DATE
    """
    params = [since]
    if league_filter:
        sql += " AND c.name ILIKE %s"
        params.append(f'%{league_filter}%')
    sql += " ORDER BY c.name, m.match_date"
    cur.execute(sql, params)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    return rows


def fetch_scored_without_events(conn, league_filter, since):
    """Return matches that have not yet had events scraped (by marker)."""
    cur = conn.cursor()
    sql = """
        SELECT m.match_id, m.match_date::text, h.name AS home_team,
               a.name AS away_team, c.name AS competition_name,
               m.home_club_id, m.away_club_id
        FROM v4.matches m
        JOIN v4.clubs h ON h.club_id = m.home_club_id
        JOIN v4.clubs a ON a.club_id = m.away_club_id
        JOIN v4.competitions c ON c.competition_id = m.competition_id
        WHERE m.home_score IS NOT NULL
          AND m.scraped_events_at IS NULL
          AND m.match_date >= %s::date
          AND m.match_date < CURRENT_DATE
    """
    params = [since]
    if league_filter:
        sql += " AND c.name ILIKE %s"
        params.append(f'%{league_filter}%')
    sql += " ORDER BY c.name, m.match_date"
    cur.execute(sql, params)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    return rows


def set_scraped_markers(conn, match_id: int, stats=False, events=False, lineups=False):
    """Set scraped_*_at = NOW() for the given match, only for the flags that are True."""
    cols = []
    if stats:   cols.append('scraped_stats_at = NOW()')
    if events:  cols.append('scraped_events_at = NOW()')
    if lineups: cols.append('scraped_lineups_at = NOW()')
    if not cols:
        return
    cur = conn.cursor()
    cur.execute(f"UPDATE v4.matches SET {', '.join(cols)} WHERE match_id = %s", [match_id])
    conn.commit()
    cur.close()


STAT_COLUMN_MAP = {
    'ht_home':          'home_score_ht',
    'ht_away':          'away_score_ht',
    'home_poss_ft':     'home_poss_ft',    'away_poss_ft':     'away_poss_ft',
    'home_shots_ft':    'home_shots_ft',   'away_shots_ft':    'away_shots_ft',
    'home_shots_ot_ft': 'home_shots_ot_ft','away_shots_ot_ft': 'away_shots_ot_ft',
    'home_shots_off_ft':'home_shots_off_ft','away_shots_off_ft':'away_shots_off_ft',
    'home_corners_ft':  'home_corners_ft', 'away_corners_ft':  'away_corners_ft',
    'home_yellows_ft':  'home_yellows_ft', 'away_yellows_ft':  'away_yellows_ft',
    'home_poss_1h':     'home_poss_1h',    'away_poss_1h':     'away_poss_1h',
    'home_shots_1h':    'home_shots_1h',   'away_shots_1h':    'away_shots_1h',
    'home_shots_ot_1h': 'home_shots_ot_1h','away_shots_ot_1h': 'away_shots_ot_1h',
    'home_shots_off_1h':'home_shots_off_1h','away_shots_off_1h':'away_shots_off_1h',
    'home_corners_1h':  'home_corners_1h', 'away_corners_1h':  'away_corners_1h',
    'home_yellows_1h':  'home_yellows_1h', 'away_yellows_1h':  'away_yellows_1h',
    'home_poss_2h':     'home_poss_2h',    'away_poss_2h':     'away_poss_2h',
    'home_shots_2h':    'home_shots_2h',   'away_shots_2h':    'away_shots_2h',
    'home_shots_ot_2h': 'home_shots_ot_2h','away_shots_ot_2h': 'away_shots_ot_2h',
    'home_shots_off_2h':'home_shots_off_2h','away_shots_off_2h':'away_shots_off_2h',
    'home_corners_2h':  'home_corners_2h', 'away_corners_2h':  'away_corners_2h',
    'home_yellows_2h':  'home_yellows_2h', 'away_yellows_2h':  'away_yellows_2h',
}


def upsert_stats(conn, match_id, stats, dry_run):
    columns = ['match_id']
    values  = [match_id]
    for key, col in STAT_COLUMN_MAP.items():
        val = stats.get(key)
        if val is not None:
            columns.append(col)
            values.append(val)

    if len(columns) == 1:
        print(f"  [db] no stats to write for {match_id}", file=sys.stderr)
        return False

    placeholders = ', '.join(['%s'] * len(values))
    updates = ', '.join(f"{c} = EXCLUDED.{c}" for c in columns[1:])
    sql = (f"INSERT INTO v4.match_stats ({', '.join(columns)}) "
           f"VALUES ({placeholders}) "
           f"ON CONFLICT (match_id) DO UPDATE SET {updates}")

    if dry_run:
        print(f"  [dry-run] Would upsert {len(columns)-1} stat cols for match {match_id}", file=sys.stderr)
        return True

    cur = conn.cursor()
    cur.execute(sql, values)
    conn.commit()
    cur.close()
    print(f"  [db] upserted {len(columns)-1} stat cols for match {match_id}", file=sys.stderr)
    return True


# ---------------------------------------------------------------------------
# Events upsert
# ---------------------------------------------------------------------------

# Per-connection player-name → person_id lookup cache (avoids repeated queries)
_player_cache = {}

def _lookup_player_id(conn, name: str):
    """Return person_id for a player by full_name (ILIKE), or None."""
    if not name:
        return None
    if name in _player_cache:
        return _player_cache[name]
    cur = conn.cursor()
    cur.execute(
        "SELECT person_id FROM v4.people WHERE full_name ILIKE %s LIMIT 1",
        [name]
    )
    row = cur.fetchone()
    pid = row['person_id'] if row else None
    _player_cache[name] = pid
    cur.close()
    return pid


def upsert_lineups(conn, match_id: int, lineups: list, home_club_id: int, away_club_id: int, dry_run: bool) -> int:
    """Insert lineups into v4.match_lineups (ON CONFLICT DO NOTHING = idempotent)."""
    if not lineups:
        return 0

    written = 0
    cur = conn.cursor()

    for p in lineups:
        club_id = home_club_id if p.get('side') == 'home' else away_club_id
        if not club_id:
            continue
        player_id = _lookup_player_id(conn, p.get('player_name'))

        if dry_run:
            print(f"  [dry-run/lineup] {p.get('side')} {'starter' if p.get('is_starter') else 'sub'} "
                  f"#{p.get('jersey_number','')} {p.get('player_name','?')}", file=sys.stderr)
            written += 1
            continue

        cur.execute(
            """INSERT INTO v4.match_lineups
               (match_id, club_id, player_id, side, is_starter, jersey_number, position_code, player_name)
               SELECT %s, %s, %s, %s, %s, %s, %s, %s
               WHERE NOT EXISTS (
                   SELECT 1 FROM v4.match_lineups
                   WHERE match_id = %s AND club_id = %s
                     AND side = %s AND player_name IS NOT DISTINCT FROM %s
               )""",
            [match_id, club_id, player_id, p.get('side'), p.get('is_starter', False),
             p.get('jersey_number'), p.get('position_code'), p.get('player_name'),
             match_id, club_id, p.get('side'), p.get('player_name')]
        )
        if cur.rowcount > 0:
            written += 1

    if not dry_run:
        conn.commit()
    cur.close()
    if written:
        print(f"  [db] inserted {written} lineups for match {match_id}", file=sys.stderr)
    return written


def upsert_events(conn, match_id: int, events: list, dry_run: bool) -> int:
    """Insert events into v4.match_events (ON CONFLICT DO NOTHING = idempotent).

    player_id is attempted via name lookup; stored as NULL when not found.
    The original name is preserved in `detail` so it's never lost.
    Returns number of rows inserted (0 in dry-run).
    """
    if not events:
        return 0

    written = 0
    cur = conn.cursor()

    for ev in events:
        event_type = ev.get('event_type', 'other')
        if event_type == 'other':
            continue  # skip unrecognised events

        event_id    = make_event_id(match_id, ev['event_order'])
        player_id   = _lookup_player_id(conn, ev.get('player_name'))
        related_id  = _lookup_player_id(conn, ev.get('related_player_name'))

        card_type = {'yellowcard': 'yellow', 'redcard': 'red',
                     'yellowred': 'yellow_red'}.get(event_type)
        goal_type = {'goal': 'normal', 'owngoal': 'own'}.get(event_type)

        # Always store player names in detail — used as display fallback when person_id is NULL
        # and to carry both names (out/in) for substitutions.
        name_parts = [n for n in [ev.get('player_name'), ev.get('related_player_name')] if n]
        detail = ' | '.join(name_parts) if name_parts else None

        if dry_run:
            print(f"  [dry-run/events] {event_type} {ev.get('minute_label','')} "
                  f"{ev.get('player_name','')} ({ev.get('side','')})", file=sys.stderr)
            written += 1
            continue

        cur.execute(
            """INSERT INTO v4.match_events
               (match_event_id, match_id, event_order, minute_label, side, event_type,
                player_id, related_player_id, goal_type, card_type, detail, score_at_event)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (match_event_id) DO NOTHING""",
            [event_id, match_id, ev['event_order'], ev.get('minute_label'),
             ev.get('side'), event_type, player_id, related_id,
             goal_type, card_type, detail, ev.get('score_at_event')]
        )
        if cur.rowcount > 0:
            written += 1

    if not dry_run:
        conn.commit()
    cur.close()
    if written:
        print(f"  [db] inserted {written} events for match {match_id}", file=sys.stderr)
    return written


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--league', default=None)
    parser.add_argument('--since', default=None)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--events-only', action='store_true',
                        help='Only backfill match_events for matches that already have match_stats')
    parser.add_argument('--lineups-only', action='store_true',
                        help='Only backfill match_lineups for matches that already have match_stats')
    args = parser.parse_args()

    since = args.since or (datetime.now() - timedelta(days=15)).strftime('%Y-%m-%d')

    conn = get_db()

    if args.lineups_only:
        matches = fetch_scored_without_lineups(conn, args.league, since)
        print(f"[backfill] {len(matches)} matches with stats but no lineups (since {since})",
              file=sys.stderr)
    elif args.events_only:
        matches = fetch_scored_without_events(conn, args.league, since)
        print(f"[backfill] {len(matches)} matches with stats but no Flashscore events (since {since})",
              file=sys.stderr)
    else:
        matches = fetch_scored_without_stats(conn, args.league, since)
        print(f"[backfill] {len(matches)} scored matches without stats (since {since})", file=sys.stderr)

    if not matches:
        print("[backfill] Nothing to do.", file=sys.stderr)
        conn.close()
        return

    # Group by competition key
    groups = {}
    for m in matches:
        key = resolve_league_key(m['competition_name'])
        if not key:
            print(f"  Skipping unknown competition: {m['competition_name']}", file=sys.stderr)
            continue
        groups.setdefault(key, []).append(m)

    # When matches are stored under the wrong 2nd-division competition (data quality issue),
    # fall back to searching the equivalent 1st-division page.
    LEAGUE_FALLBACK = {
        'LaLiga2':     'LaLiga',
        'Bundesliga2': 'Bundesliga',
        'Ligue2':      'Ligue1',
        'SerieB':      'SerieA',
        'Championship':'PremierLeague',
    }

    counters = {'found': 0, 'written': 0, 'skipped': 0, 'events': 0, 'lineups': 0}

    def _process_league(main_page, browser, league_key, target_matches, conn, dry_run, counters,
                        events_only=False, lineups_only=False):
        """Search one Flashscore results page and write stats (and events) for found matches.
        When events_only=True, skip upsert_stats (stats already present) and only write events+lineups.
        When lineups_only=True, skip stats and events, only write lineups.
        Returns the list of target_matches that were NOT found."""
        country, slug = FLASHSCORE_LEAGUES[league_key]
        if lineups_only:
            mode_label = "lineups-only"
        elif events_only:
            mode_label = "events-only"
        else:
            mode_label = "stats+events+lineups"
        print(f"\n[backfill/{league_key}/{mode_label}] {len(target_matches)} matches", file=sys.stderr)
        unfound = list(target_matches)
        try:
            since_for_league = min(m['match_date'] for m in target_matches)
            parsed_rows, _ = load_results_page(main_page, country, slug, since_for_league)
            dates_needed = {m['match_date'] for m in target_matches}

            for row in parsed_rows:
                if row['date_str'] not in dates_needed:
                    continue
                for tm in list(unfound):
                    if tm['match_date'] != row['date_str']:
                        continue
                    if not (teams_match(row['scraped_home'], tm['home_team']) and
                            teams_match(row['scraped_away'], tm['away_team'])):
                        continue

                    print(
                        f"  FOUND {tm['match_id']} {tm['home_team']} "
                        f"{row['home_score']}-{row['away_score']} {tm['away_team']}",
                        file=sys.stderr
                    )
                    counters['found'] += 1
                    unfound.remove(tm)

                    if not row['fs_match_id']:
                        print(f"  No fs_match_id — skipping", file=sys.stderr)
                        counters['skipped'] += 1
                        break

                    stats = scrape_match_detail(browser, row['fs_match_id'])
                    if stats:
                        did_stats = False
                        did_events = False
                        did_lineups = False
                        if not events_only and not lineups_only:
                            ok = upsert_stats(conn, tm['match_id'], stats, dry_run)
                            if ok:
                                counters['written'] += 1
                                did_stats = True
                        if not lineups_only:
                            events = stats.get('_events', [])
                            upsert_events(conn, tm['match_id'], events, dry_run)
                            counters['events'] += len(events)
                            did_events = True
                        lineups = stats.get('_lineups', [])
                        upsert_lineups(
                            conn, tm['match_id'], lineups,
                            tm.get('home_club_id'), tm.get('away_club_id'), dry_run
                        )
                        counters['lineups'] += len(lineups)
                        did_lineups = True
                        if not dry_run:
                            set_scraped_markers(conn, tm['match_id'],
                                                stats=did_stats,
                                                events=did_events,
                                                lineups=did_lineups)
                    else:
                        counters['skipped'] += 1
                    break

        except Exception as e:
            print(f"[backfill/{league_key}] Error: {e}", file=sys.stderr)
        return unfound

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        main_page = browser.new_page()
        main_page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })

        for league_key, target_matches in groups.items():
            unfound = _process_league(
                main_page, browser, league_key, target_matches, conn, args.dry_run, counters,
                events_only=args.events_only, lineups_only=args.lineups_only
            )
            # Fallback: some matches may be stored under wrong tier competition
            if unfound and league_key in LEAGUE_FALLBACK:
                fallback_key = LEAGUE_FALLBACK[league_key]
                print(f"  [fallback] {len(unfound)} not found — retrying with {fallback_key}",
                      file=sys.stderr)
                _process_league(
                    main_page, browser, fallback_key, unfound, conn, args.dry_run, counters,
                    events_only=args.events_only, lineups_only=args.lineups_only
                )

        main_page.close()
        browser.close()

    conn.close()
    print(f"\n[backfill] Done — found={counters['found']} written={counters['written']} events={counters['events']} lineups={counters['lineups']} skipped={counters['skipped']}",
          file=sys.stderr)


if __name__ == '__main__':
    main()
