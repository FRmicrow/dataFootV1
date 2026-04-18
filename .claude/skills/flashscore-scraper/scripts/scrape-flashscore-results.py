#!/usr/bin/env python3
"""
Flashscore Match Results Scraper
Two modes:
  - update  (default): finds matches in v4.matches with no score, scrapes result
  - discover:          scrapes cup competition results and emits matches to insert

Usage:
    python scrape-flashscore-results.py [options]

Options:
    --mode=update|discover|all  Scraping mode (default: update)
    --dry-run                   Output JSON without writing to DB
    --league=<key>              Filter a specific competition key (e.g. PremierLeague)
    --since=<YYYY-MM-DD>        Lookback start date (default: 30 days ago)
    --output=<file>             Write JSON to file instead of stdout

Output JSON shape:
    action="update" → { action, match_id, home_score, away_score, ...stats }
    action="insert" → { action, fs_key, competition_name, home_team, away_team,
                         match_date, home_score, away_score, ...stats }
"""

import sys
import os
import json
import re
import argparse
import unicodedata
from datetime import datetime, timedelta
from typing import Optional
from playwright.sync_api import sync_playwright
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# Resolve project root (4 levels up from .claude/skills/flashscore-scraper/scripts/)
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../'))
load_dotenv(os.path.join(_PROJECT_ROOT, 'backend', '.env'))

# ---------------------------------------------------------------------------
# Competition maps
# ---------------------------------------------------------------------------

# Leagues: matches are pre-imported in v4.matches → action = "update"
FLASHSCORE_LEAGUES = {
    "PremierLeague":  ("england",      "premier-league"),
    "Ligue1":         ("france",       "ligue-1"),
    "SerieA":         ("italy",        "serie-a"),
    "SerieB":         ("italy",        "serie-b"),
    "LaLiga":         ("spain",        "laliga"),
    "Bundesliga":     ("germany",      "bundesliga"),
    "LigaPortugal":   ("portugal",     "liga-portugal"),
    "Eredivisie":     ("netherlands",  "eredivisie"),
    "Ligue2":         ("france",       "ligue-2"),
    "Championship":   ("england",      "championship"),
    "LaLiga2":        ("spain",        "laliga2"),
    "Bundesliga2":    ("germany",      "2-bundesliga"),
}

# Cups: matches are NOT pre-imported → action = "insert"
FLASHSCORE_CUPS = {
    "ChampionsLeague":  ("europe",       "champions-league"),
    "EuropaLeague":     ("europe",       "europa-league"),
    "ConferenceLeague": ("europe",       "conference-league"),
    "FACup":            ("england",      "fa-cup"),
    "CoupeDeFrame":     ("france",       "coupe-de-france"),
    "CopadelRey":       ("spain",        "copa-del-rey"),
    "DFBPokal":         ("germany",      "dfb-pokal"),
    "CoppaItalia":      ("italy",        "coppa-italia"),
    "TacaDePortugal":   ("portugal",     "taca-de-portugal"),
    "KNVBCup":          ("netherlands",  "knvb-cup"),
}

# Human-readable competition name per Flashscore key (used for DB lookup)
CUP_COMPETITION_NAMES = {
    "ChampionsLeague":  "UEFA Champions League",
    "EuropaLeague":     "UEFA Europa League",
    "ConferenceLeague": "UEFA Conference League",
    "FACup":            "FA Cup",
    "CoupeDeFrame":     "Coupe de France",
    "CopadelRey":       "Copa del Rey",
    "DFBPokal":         "DFB-Pokal",
    "CoppaItalia":      "Coppa Italia",
    "TacaDePortugal":   "Taça de Portugal",
    "KNVBCup":          "KNVB Cup",
}

# v4.competitions.name → league key (for resolving competition of league matches)
COMPETITION_NAME_MAP = {
    # More specific entries FIRST (avoid substring false-matches)
    "EFL Championship": "Championship",
    "Premier League":   "PremierLeague",
    "LaLiga2":          "LaLiga2",
    "LaLiga 2":         "LaLiga2",
    "Segunda División": "LaLiga2",
    "2. Bundesliga":    "Bundesliga2",
    "Ligue 1":          "Ligue1",
    "Ligue 2":          "Ligue2",
    "Serie A":          "SerieA",
    "Serie B":          "SerieB",
    "LaLiga":           "LaLiga",
    "La Liga":          "LaLiga",
    "Bundesliga":       "Bundesliga",
    "Liga Portugal":    "LigaPortugal",
    "Eredivisie":       "Eredivisie",
    "Championship":     "Championship",
}

# ---------------------------------------------------------------------------
# Team name aliases  (DB name → Flashscore canonical name)
# Keys use the exact DB spelling; values use the Flashscore spelling.
# Applied BEFORE normalize(), so accents/tokens are handled afterwards.
# ---------------------------------------------------------------------------
TEAM_ALIASES = {
    # German clubs — French names in DB
    "Eintracht Francfort":          "Eintracht Frankfurt",
    "SC Fribourg":                  "Freiburg",
    "Bayer 04 Leverkusen":          "Bayer Leverkusen",
    "1. FC Köln":                   "FC Koln",
    "Borussia Mönchengladbach":     "B. Monchengladbach",
    # Spanish clubs — French names in DB
    "FC Barcelone":                 "Barcelona",
    "Séville FC":                   "Sevilla",
    "Athletic Bilbao":              "Ath Bilbao",
    "Athletic Club":                "Ath Bilbao",
    "Atlético de Madrid":           "Atl. Madrid",
    "Deportivo de La Coruña":       "Dep. La Coruna",
    "Club Celta de Vigo":           "Celta Vigo",
    "Club Deportivo Alavés":        "Alaves",
    "Leganés CF":                   "Leganes",
    "RCD Málaga":                   "Malaga",
    "CD Mirandés":                  "Mirandes",
    # French clubs
    "Paris Saint-Germain":          "Paris",
    "Stade Rennais FC":             "Rennes",
    "AS Saint-Étienne":             "St Etienne",
    "USL Dunkerque":                "Dunkerque",
    "Paris FC":                     "Paris FC",
    # English clubs
    "Queens Park Rangers":          "QPR",
    "Wolverhampton Wanderers":      "Wolves",
    # Italian clubs — French names in DB
    "Palerme FC":                   "Palermo",
    "Frosinone Calcio":             "Frosinone",
    # Dutch clubs
    "Go Ahead Eagles Deventer":     "G.A. Eagles",
    "FC Groningen":                 "Groningen",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalize(name: str) -> str:
    # Strip diacritics (é→e, ó→o, ü→u, etc.)
    name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii')
    name = name.lower()
    name = re.sub(r'\b(fc|utd|united|city|afc|rc|ogc|as|ol|aj|sco|ac|cf|sc|1\.)\b', '', name)
    name = re.sub(r'[^\w\s]', '', name)
    return name.strip()


def resolve_alias(name: str) -> str:
    """Apply TEAM_ALIASES lookup (exact match on original name)."""
    return TEAM_ALIASES.get(name, name)


def teams_match(scraped: str, expected: str) -> bool:
    # Resolve aliases on both sides before normalizing
    scraped  = resolve_alias(scraped)
    expected = resolve_alias(expected)
    s = normalize(scraped)
    e = normalize(expected)
    return s == e or s in e or e in s


def parse_score(text: str):
    m = re.search(r'(\d+)\s*[-:–]\s*(\d+)', text)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None


def parse_int(value: str):
    m = re.search(r'(\d+)', value)
    return int(m.group(1)) if m else None


def resolve_league_key(competition_name: str):
    """Map a DB competition name to a Flashscore league key.

    Uses startswith (not substring) to prevent false positives like
    "National Premier League - Victoria" matching "Premier League".
    """
    name = competition_name.strip().lower()
    for pattern, key in COMPETITION_NAME_MAP.items():
        if name.startswith(pattern.lower()):
            return key
    return None


def date_in_range(date_str: str, since: str) -> bool:
    """Return True if date_str (YYYY-MM-DD) is within [since, today)."""
    today = datetime.now().strftime('%Y-%m-%d')
    return since <= date_str < today


def get_db_connection():
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        # Fallback: docker-compose default (port 5432 mapped to localhost)
        db_url = 'postgresql://statfoot_user:statfoot_password@localhost:5432/statfoot'
        print(f"[db] DATABASE_URL not set — using localhost fallback", file=sys.stderr)
    return psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)


def current_season() -> str:
    """Return current season label (e.g. '2025-2026')."""
    now = datetime.now()
    year = now.year if now.month >= 7 else now.year - 1
    return f"{year}-{year + 1}"


def resolve_competition_tier(competition_name: str, force_tier: int = 0) -> int:
    """
    Tier 1 (Full: stats + events + lineups) if the competition already has
    Flashscore-scraped events this season. Tier 2 (Score only) otherwise.

    force_tier=1 bypasses the DB check and always returns 1 (for backfill runs).
    """
    if force_tier == 1:
        return 1
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM v4.matches m
                JOIN v4.competitions c ON c.competition_id = m.competition_id
                WHERE c.name ILIKE %s
                  AND m.season_label = %s
                  AND m.scraped_events_at IS NOT NULL
            )
            """,
            [f'%{competition_name}%', current_season()]
        )
        row = cur.fetchone()
        has_events = row['exists'] if row else False
        cur.close()
        conn.close()
        return 1 if has_events else 2
    except Exception as e:
        print(f"[tier] DB check failed ({e}) — defaulting to Tier 1", file=sys.stderr)
        return 1


def fetch_unresolved_matches(league_filter, since: str) -> list:
    """Query v4.matches for league matches without a score."""
    conn = get_db_connection()
    cur = conn.cursor()
    sql = """
        SELECT m.match_id,
               (m.match_date AT TIME ZONE 'Europe/Paris')::date::text AS match_date,
               h.name AS home_team,
               a.name AS away_team,
               c.name AS competition_name
        FROM v4.matches m
        JOIN v4.clubs        h ON h.club_id        = m.home_club_id
        JOIN v4.clubs        a ON a.club_id        = m.away_club_id
        JOIN v4.competitions c ON c.competition_id = m.competition_id
        WHERE m.home_score IS NULL
          AND m.away_score IS NULL
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date < CURRENT_DATE
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date >= %s::date
    """
    params = [since]
    if league_filter:
        sql += " AND c.name ILIKE %s"
        params.append(f'%{league_filter}%')
    sql += " ORDER BY m.match_date ASC"
    cur.execute(sql, params)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def fetch_scored_without_detail(league_filter, since: str) -> list:
    """Query v4.matches for league matches missing any detail (events OR lineups OR stats)."""
    conn = get_db_connection()
    cur = conn.cursor()
    sql = """
        SELECT m.match_id,
               (m.match_date AT TIME ZONE 'Europe/Paris')::date::text AS match_date,
               h.name AS home_team,
               a.name AS away_team,
               c.name AS competition_name,
               m.home_score,
               m.away_score
        FROM v4.matches m
        JOIN v4.clubs        h ON h.club_id        = m.home_club_id
        JOIN v4.clubs        a ON a.club_id        = m.away_club_id
        JOIN v4.competitions c ON c.competition_id = m.competition_id
        WHERE m.home_score IS NOT NULL
          AND (
              m.scraped_events_at IS NULL
           OR m.scraped_lineups_at IS NULL
           OR m.scraped_stats_at IS NULL
          )
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date < CURRENT_DATE
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date >= %s::date
    """
    params = [since]
    if league_filter:
        sql += " AND c.name ILIKE %s"
        params.append(f'%{league_filter}%')
    sql += " ORDER BY m.match_date ASC"
    cur.execute(sql, params)
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


# ---------------------------------------------------------------------------
# Playwright helpers
# ---------------------------------------------------------------------------

def dismiss_popups(page):
    for sel in [
        "#onetrust-accept-btn-handler",
        "button:has-text('Accept')",
        "button:has-text('Agree')",
        ".wcl-button:has-text('Accept')",
    ]:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=1500):
                btn.click()
                page.wait_for_timeout(800)
                print("[popup] dismissed", file=sys.stderr)
                return
        except Exception:
            pass


def expand_results(page, max_clicks: int = 8):
    """Click 'Show more' to load older results."""
    for _ in range(max_clicks):
        try:
            btn = page.locator(
                "a:has-text('Show more matches'), button:has-text('Show more')"
            ).first
            if btn.is_visible(timeout=2000):
                btn.click()
                page.wait_for_timeout(1500)
            else:
                break
        except Exception:
            break


def parse_result_row(row) -> Optional[dict]:
    """
    Parse a single Flashscore result row element.
    Returns dict with keys: date_str, scraped_home, scraped_away,
    home_score, away_score, ht_home, ht_away, fs_match_id
    or None if the row is not a valid finished match.
    """
    try:
        row_text = row.inner_text()
        lines = [l.strip() for l in row_text.split('\n') if l.strip()]

        # Date — Flashscore format: "14.04. 21:00" (no year) or legacy "14.04.2026"
        date_str = None
        current_year = datetime.now().year
        for line in lines:
            # Legacy: DD.MM.YYYY
            dm = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', line)
            if dm:
                date_str = f"{dm.group(3)}-{dm.group(2)}-{dm.group(1)}"
                break
            # Current: DD.MM. (HH:MM optional)
            dm2 = re.search(r'(\d{2})\.(\d{2})\.\s*(?:\d{2}:\d{2})?', line)
            if dm2:
                date_str = f"{current_year}-{dm2.group(2)}-{dm2.group(1)}"
                break
        if not date_str:
            return None

        # Score — three possible Flashscore formats:
        #   a) "2-0" on one line
        #   b) Two consecutive digit lines at end: [..., team1, team2, "2", "0"]
        #   c) Interleaved: [..., team1, "2", team2, "1", ...]  (some matches)
        home_score, away_score = None, None
        score_line = next((l for l in lines if re.search(r'^\d+\s*[-:–]\s*\d+$', l)), None)
        if score_line:
            home_score, away_score = parse_score(score_line)
        else:
            digit_indices = [i for i, l in enumerate(lines) if re.match(r'^\d+$', l)]
            if len(digit_indices) >= 2:
                if digit_indices[1] == digit_indices[0] + 1:
                    # Format b: consecutive at end
                    home_score = int(lines[digit_indices[0]])
                    away_score = int(lines[digit_indices[1]])
                else:
                    # Format c: interleaved — take first two digits found
                    home_score = int(lines[digit_indices[0]])
                    away_score = int(lines[digit_indices[1]])
        if home_score is None:
            return None

        # Team names — exclude date line, score lines, time lines
        team_lines = [
            l for l in lines
            if not re.search(r'\d{2}\.\d{2}', l)
            and not re.search(r'^\d+$', l)
            and not re.search(r'^\d+\s*[-:–]\s*\d+', l)
            and not re.search(r'^\d{2}:\d{2}$', l)
            and len(l) > 2
        ]
        if len(team_lines) < 2:
            return None

        # HT score — "(1-0)" or "(1 - 0)"
        ht_home, ht_away = None, None
        for line in lines:
            m = re.search(r'\((\d+)\s*[-:–]\s*(\d+)\)', line)
            if m:
                ht_home, ht_away = int(m.group(1)), int(m.group(2))
                break

        # Flashscore match ID from element id (e.g. "g_1_AbCdEfGh")
        row_id = row.get_attribute("id") or ""
        fs_match_id = None
        id_match = re.search(r'g_\d+_([A-Za-z0-9]+)$', row_id)
        if id_match:
            fs_match_id = id_match.group(1)

        return {
            "date_str":     date_str,
            "scraped_home": team_lines[0],
            "scraped_away": team_lines[1],
            "home_score":   home_score,
            "away_score":   away_score,
            "ht_home":      ht_home,
            "ht_away":      ht_away,
            "fs_match_id":  fs_match_id,
        }
    except Exception:
        return None


STAT_LABEL_MAP = {
    # Flashscore current labels (as of 2025-2026)
    "ball possession":  ("home_poss",      "away_poss"),
    "possession":       ("home_poss",      "away_poss"),
    "total shots":      ("home_shots",     "away_shots"),
    "goal attempts":    ("home_shots",     "away_shots"),
    "shots on target":  ("home_shots_ot",  "away_shots_ot"),
    "shots on goal":    ("home_shots_ot",  "away_shots_ot"),
    "shots off target": ("home_shots_off", "away_shots_off"),
    "shots off goal":   ("home_shots_off", "away_shots_off"),
    "corner kicks":     ("home_corners",   "away_corners"),
    "corners":          ("home_corners",   "away_corners"),
    "yellow cards":     ("home_yellows",   "away_yellows"),
}


def _extract_stats_from_dom(page, suffix: str) -> dict:
    """
    Extract stats from Flashscore's current wcl-row DOM structure.
    Uses data-testid attributes which are stable across class name changes.
    """
    result = {}
    rows = page.locator("[class*='wcl-row']").all()
    seen_labels = set()

    for row in rows:
        try:
            cat_el = row.locator("[data-testid='wcl-statistics-category']")
            val_els = row.locator("[data-testid='wcl-statistics-value']").all()
            if cat_el.count() == 0 or len(val_els) < 2:
                continue
            label = cat_el.first.inner_text().strip().lower()
            if label in seen_labels:
                continue
            seen_labels.add(label)
            home_val = parse_int(val_els[0].inner_text())
            away_val = parse_int(val_els[1].inner_text())
            for stat_label, (hk, ak) in STAT_LABEL_MAP.items():
                if stat_label in label:
                    result[f"{hk}_{suffix}"] = home_val
                    result[f"{ak}_{suffix}"] = away_val
                    break
        except Exception:
            continue

    if result:
        print(f"  [stats/{suffix}] DOM: {len(result)//2} stats extracted", file=sys.stderr)
    return result


def _extract_stats_fallback(page, suffix: str) -> dict:
    """
    Text-based fallback: Layout A (val\\nlabel\\nval) and Layout B (label\\nval\\nval).
    Used when DOM extraction returns nothing.
    """
    result = {}
    try:
        body = page.inner_text("body")
        lines = [l.strip() for l in body.split('\n') if l.strip()]
        seen = set()
        for i, line in enumerate(lines):
            ll = line.lower()
            for stat_label, (hk, ak) in STAT_LABEL_MAP.items():
                if stat_label not in ll or stat_label in seen:
                    continue
                # Layout A: lines[i-1]=home, lines[i]=label, lines[i+1]=away
                if i > 0 and i < len(lines) - 1:
                    hm = re.match(r'^(\d+)%?$', lines[i - 1])
                    am = re.match(r'^(\d+)%?$', lines[i + 1])
                    if hm and am:
                        result[f"{hk}_{suffix}"] = int(hm.group(1))
                        result[f"{ak}_{suffix}"] = int(am.group(1))
                        seen.add(stat_label)
                        break
                # Layout B: lines[i]=label, lines[i+1]=home, lines[i+2]=away
                if i < len(lines) - 2:
                    hm = re.match(r'^(\d+)%?$', lines[i + 1])
                    am = re.match(r'^(\d+)%?$', lines[i + 2])
                    if hm and am:
                        result[f"{hk}_{suffix}"] = int(hm.group(1))
                        result[f"{ak}_{suffix}"] = int(am.group(1))
                        seen.add(stat_label)
                break
    except Exception:
        pass
    if result:
        print(f"  [stats/{suffix}] text-fallback: {len(result)//2} stats", file=sys.stderr)
    return result


def _extract_lineups_from_page(page) -> list:
    """
    Extract starting XI and substitutes from a Flashscore lineups page.

    Flashscore lineup DOM (2025-2026, confirmed via inspection):

    Field view (starters):
      - Two lf__formation blocks: first = home, second has class "lf__formationAway"
      - Inside each: lf__player divs
      - Player name is in <img alt="Name"> inside each lf__player
      - Jersey number is in a span with data-testid="wcl-scores-simpleText" or similar

    List view (starters + subs listed below the field):
      - lf__sidesBox / lf__sides containers
      - lf__element rows, each containing player name link and jersey number
      - A "substitutes" header separates starters from subs in list view

    Strategy: use lf__formation (home/away distinction via class) for starters,
    then lf__sides list for substitutes.
    """
    lineups = []
    try:
        # Wait for either the field view OR the list view to appear
        for sel in ["[class*='lf__formation']", "[class*='lf__participantNew']", "[class*='lf__sidesBox']"]:
            try:
                page.wait_for_selector(sel, timeout=5000)
                break
            except Exception:
                continue

        page.wait_for_timeout(1000)

        lineups = page.evaluate(r"""
        () => {
            const result = [];
            const seen = new Set(); // dedup key: side+name

            // Get player name from a participant element.
            // DOM structure differs by type:
            //   Starters (lf__participantNew without substituedPlayer):
            //     img[alt] = nationality/flag (NOT the name)
            //     name is in a span (2nd span after jersey number)
            //   Substitutes (lf__participantNew--substituedPlayer):
            //     img[alt] = player going OFF (outgoing)
            //     <a> text = player coming ON (incoming)
            // Strategy: for starters, read from spans; for subs, read from img[alt] (outgoing) and a (incoming).
            const getStarterName = el => {
                // Primary: span with class containing "wcl-name" (stable Flashscore class)
                const nameSpan = el.querySelector('span[class*="wcl-name"]');
                if (nameSpan) {
                    const t = nameSpan.textContent.trim();
                    if (t && t.length > 2) return t;
                }
                // Fallback: first span that's not a jersey number, position, or rating
                const spans = Array.from(el.querySelectorAll('span'));
                for (const s of spans) {
                    const t = s.textContent.trim();
                    if (!t || /^\d{1,2}$/.test(t) || /^\(\w\)$/.test(t) || /^\d+\.\d+$/.test(t)) continue;
                    if (t.length > 2) return t;
                }
                return null;
            };

            const getJersey = el => {
                const spans = Array.from(el.querySelectorAll('span, div'));
                for (const s of spans) {
                    const t = s.textContent.trim();
                    if (/^\d{1,2}$/.test(t)) return t;
                }
                return null;
            };

            const addPlayer = (side, is_starter, playerName, jerseyNumber) => {
                const key = side + '|' + playerName;
                if (seen.has(key)) return;
                seen.add(key);
                result.push({ side, is_starter, player_name: playerName, jersey_number: jerseyNumber, position_code: null });
            };

            // ── Strategy 1: list view (lf__sidesBox) — most reliable, has all players ──
            // Structure: lf__sidesBox > lf__sides > [lf__side home, lf__side away]
            // Each participant: lf__participantNew (starters) or lf__participantNew--substituedPlayer (subs)
            const sidesBoxes = Array.from(document.querySelectorAll('[class*="lf__sidesBox"]'));
            sidesBoxes.forEach(box => {
                const sides = Array.from(box.querySelectorAll('[class*="lf__sides"]'));
                sides.forEach(sidesEl => {
                    const cols = Array.from(sidesEl.querySelectorAll(':scope > [class*="lf__side"]'));
                    const sideLabels = ['home', 'away'];
                    cols.slice(0, 2).forEach((col, idx) => {
                        const side = sideLabels[idx];
                        const participants = Array.from(col.querySelectorAll('[class*="lf__participantNew"]'));
                        participants.forEach(pEl => {
                            const cls = pEl.getAttribute('class') || '';
                            const isSub = cls.includes('substituedPlayer') || cls.includes('substituted');

                            if (isSub) {
                                // Sub: img[alt] = player going OFF
                                const img = pEl.querySelector('img[alt]');
                                const outName = img ? img.getAttribute('alt').trim() : null;
                                if (outName && outName.length > 2) addPlayer(side, false, outName, null);
                            } else {
                                // Starter: img[alt] = nationality flag — use spans for name
                                const name = getStarterName(pEl);
                                if (name) addPlayer(side, true, name, getJersey(pEl));
                            }
                        });
                    });
                });
            });

            // ── Strategy 2: tactical field view (lf__formation) — fallback if list view empty ──
            if (result.length === 0) {
                const formations = Array.from(document.querySelectorAll('[class*="lf__formation"]'));
                formations.forEach(formation => {
                    const cls = formation.getAttribute('class') || '';
                    const side = cls.includes('Away') ? 'away' : 'home';
                    const players = Array.from(formation.querySelectorAll('[class*="lf__player"]'));
                    players.forEach(playerEl => {
                        const playerName = getName(playerEl);
                        if (!playerName) return;
                        addPlayer(side, true, playerName, getJersey(playerEl));
                    });
                });
            }

            return result;
        }
        """)
        print(f"  [lineups] DOM: {len(lineups)} players extracted", file=sys.stderr)
    except Exception as e:
        print(f"  [lineups] extraction failed: {e}", file=sys.stderr)
        lineups = []

    return lineups


def _extract_events_from_page(page) -> list:
    """Extract match events (goals, cards, substitutions) from the loaded Flashscore match page.

    Returns a list of dicts:
        event_order, minute_label, side, event_type, player_name,
        related_player_name, score_at_event
    """
    try:
        # Give the DOM a moment if incidents haven't rendered yet
        try:
            page.wait_for_selector("[class*='smv__participantRow']", timeout=4000)
        except Exception:
            pass

        events = page.evaluate(r"""
        () => {
            const result = [];
            let order = 1;

            // Real Flashscore DOM: each event is a <div class="smv__participantRow smv__homeParticipant"> (or awayParticipant)
            const rows = Array.from(document.querySelectorAll('[class*="smv__participantRow"]'));
            if (rows.length === 0) return [];

            rows.forEach(row => {
                try {
                    // --- Side: the participantRow itself carries the home/away class ---
                    const cls = row.className || '';
                    const side = cls.includes('smv__homeParticipant') ? 'home'
                               : cls.includes('smv__awayParticipant') ? 'away'
                               : null;
                    if (!side) return; // skip neutral rows (HT break, etc.)

                    // --- Minute ---
                    const timeEl = row.querySelector('[class*="smv__timeBox"]');
                    const rawMin = timeEl ? timeEl.textContent.trim() : null;
                    const minuteLabel = rawMin ? rawMin.replace(/[^0-9+]/g, '') + "'" : null;

                    // --- Event type ---
                    // Goals: <svg data-testid="wcl-icon-incidents-goal-soccer">
                    // Own goal: data-testid contains "own-goal"
                    // Cards: <svg class="yellowCard-ico"> or <svg class="redCard-ico">
                    //        second yellow (yellowred): <svg class="yellowCard-ico yellowRedCard-ico"> or xlink:href contains "yellowred"
                    // Substitution: icon wrapper has class smv__incidentIconSub
                    // Missed penalty: data-testid contains "penalty-missed" or "missed-penalty"
                    const svgGoal  = row.querySelector('svg[data-testid*="goal-soccer"]');
                    const svgOwn   = row.querySelector('svg[data-testid*="own-goal"]');
                    const svgMiss  = row.querySelector('svg[data-testid*="penalty-missed"], svg[data-testid*="missed-penalty"]');
                    const svgYR    = row.querySelector('svg.yellowRedCard-ico, svg[class*="yellowRed"]');
                    const svgRed   = row.querySelector('svg.redCard-ico, svg[class*="redCard"]');
                    const svgYel   = row.querySelector('svg.yellowCard-ico, svg[class*="yellowCard"]');
                    const iconSub  = row.querySelector('[class*="smv__incidentIconSub"]');

                    let eventType = 'other';
                    if      (svgOwn)  eventType = 'owngoal';
                    else if (svgMiss) eventType = 'penalty_missed';
                    else if (svgGoal) eventType = 'goal';
                    else if (svgYR)   eventType = 'yellowred';
                    else if (svgRed)  eventType = 'redcard';
                    else if (svgYel)  eventType = 'yellowcard';
                    else if (iconSub) eventType = 'substitution';

                    // --- Score at event ---
                    const scoreEl = row.querySelector('[class*="smv__score"]');
                    const scoreAtEvent = scoreEl ? scoreEl.textContent.trim() : null;

                    // --- Player names: <a class="smv__playerName"><div>Name</div></a> ---
                    const nameEls = Array.from(row.querySelectorAll('[class*="smv__playerName"]'));
                    // Each element: get innerText of its first <div> child, or textContent
                    const getName = el => {
                        const inner = el.querySelector('div');
                        return (inner ? inner.textContent : el.textContent).trim() || null;
                    };
                    const playerName  = nameEls[0] ? getName(nameEls[0]) : null;
                    const relatedName = nameEls[1] ? getName(nameEls[1]) : null;

                    if (minuteLabel || playerName) {
                        result.push({
                            event_order:         order,
                            minute_label:        minuteLabel,
                            side:                side,
                            event_type:          eventType,
                            player_name:         playerName,
                            related_player_name: relatedName,
                            score_at_event:      scoreAtEvent,
                        });
                        order++;
                    }
                } catch (_) { /* skip malformed row */ }
            });
            return result;
        }
        """)
        print(f"  [events] DOM: {len(events)} events extracted", file=sys.stderr)
        return events
    except Exception as e:
        print(f"  [events] extraction failed: {e}", file=sys.stderr)
        return []


def _extract_ht_score_from_page(page) -> dict:
    """Extract HT score from a loaded Flashscore match page via DOM."""
    try:
        result = page.evaluate(r"""
            () => {
                // Look for detailScore or smh__part elements showing HT score
                const selectors = [
                    "[class*='detailScore__status']",
                    "[class*='smh__part']",
                    "[class*='fixedScore']",
                ];
                for (const sel of selectors) {
                    const els = document.querySelectorAll(sel);
                    for (const el of els) {
                        const text = el.textContent.trim();
                        const m = text.match(/(\d+)\s*[-–]\s*(\d+)/);
                        if (m) return {ht_home: parseInt(m[1]), ht_away: parseInt(m[2])};
                    }
                }
                // Fallback: look for "1st Half" section score
                const body = document.body.innerText;
                const m = body.match(/\b(?:HT|Half[- ]?[Tt]ime)\s+(\d+)\s*[-–]\s*(\d+)/);
                if (m) return {ht_home: parseInt(m[1]), ht_away: parseInt(m[2])};
                // Pattern "(0-0)" in score area
                const m2 = body.match(/\((\d+)\s*[-–]\s*(\d+)\)/);
                if (m2) return {ht_home: parseInt(m2[1]), ht_away: parseInt(m2[2])};
                return null;
            }
        """)
        if result:
            return result
    except Exception as e:
        print(f"  [ht] DOM extraction failed: {e}", file=sys.stderr)
    return {}


def scrape_match_detail(browser, fs_match_id: str) -> dict:
    """
    Scrape HT score + FT/1H/2H stats for a single match.

    Strategy:
      1. Navigate to base match URL → get redirected full slug URL + HT score
      2. Construct the /summary/stats URL from the redirected URL
      3. Navigate to stats page → extract FT stats via data-testid DOM selectors
      4. Click "1st Half" / "2nd Half" tabs → extract period stats
      5. All on a fresh dedicated page (never touches the results-browsing page)
    """
    match_base = f"https://www.flashscore.com/match/{fs_match_id}/"
    print(f"  [detail] {match_base}", file=sys.stderr)

    page = browser.new_page()
    page.set_extra_http_headers({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })

    stats = {}
    try:
        # Step 1 — load base URL, let it redirect to full slug URL
        page.goto(match_base, wait_until="domcontentloaded", timeout=25000)
        page.wait_for_timeout(3000)
        dismiss_popups(page)

        # Try to get HT score from the match summary page
        stats.update(_extract_ht_score_from_page(page))

        # Extract events while still on the base match URL (goals, cards, subs visible here)
        stats['_events'] = _extract_events_from_page(page)

        # Step 2 — build base URL from the current (redirected) URL
        current_url = page.url.split('#')[0].split('?')[0].rstrip('/')

        # Step 2b — scrape lineups by navigating to the /lineups sub-URL
        # Flashscore renders an <a href="/match/.../summary/lineups/?mid=..."> tab.
        # We extract that href and navigate directly — more reliable than clicking.
        print(f"  [detail] resolving lineups URL", file=sys.stderr)
        stats['_lineups'] = []
        try:
            lineups_href = page.evaluate("""
            () => {
                const el = document.querySelector('a[href*="lineups"]');
                return el ? el.getAttribute('href') : null;
            }
            """)
            if lineups_href:
                lineups_url = f"https://www.flashscore.com{lineups_href}" if lineups_href.startswith('/') else lineups_href
                print(f"  [detail] lineups URL: {lineups_url}", file=sys.stderr)
                page.goto(lineups_url, wait_until="domcontentloaded", timeout=25000)
                try:
                    page.wait_for_selector("[class*='lf__formation']", timeout=8000)
                except Exception:
                    pass
                page.wait_for_timeout(2000)
                dismiss_popups(page)
                stats['_lineups'] = _extract_lineups_from_page(page)
            else:
                print(f"  [lineups] href not found in DOM — skipping", file=sys.stderr)
        except Exception as e:
            print(f"  [lineups] navigation failed: {e}", file=sys.stderr)

        stats_url = f"{current_url}/summary/stats?mid={fs_match_id}"
        print(f"  [detail] stats URL: {stats_url}", file=sys.stderr)

        # Step 3 — navigate to full stats page
        page.goto(stats_url, wait_until="domcontentloaded", timeout=25000)
        page.wait_for_timeout(4000)
        dismiss_popups(page)

        # Wait for stats rows to appear
        try:
            page.wait_for_selector("[data-testid='wcl-statistics-category']", timeout=8000)
        except Exception:
            pass  # still try extraction

        # Extract FT (default tab = "Match")
        ft_stats = _extract_stats_from_dom(page, "ft")
        if not ft_stats:
            ft_stats = _extract_stats_fallback(page, "ft")
        stats.update(ft_stats)

        # Step 4 — click "1st Half" tab
        try:
            btn_1h = page.locator("button:has-text('1st Half')").first
            if btn_1h.is_visible(timeout=3000):
                btn_1h.click()
                page.wait_for_timeout(2000)
                h1_stats = _extract_stats_from_dom(page, "1h")
                if not h1_stats:
                    h1_stats = _extract_stats_fallback(page, "1h")
                stats.update(h1_stats)
        except Exception as e:
            print(f"  [stats/1h] tab click failed: {e}", file=sys.stderr)

        # Step 5 — click "2nd Half" tab
        try:
            btn_2h = page.locator("button:has-text('2nd Half')").first
            if btn_2h.is_visible(timeout=3000):
                btn_2h.click()
                page.wait_for_timeout(2000)
                h2_stats = _extract_stats_from_dom(page, "2h")
                if not h2_stats:
                    h2_stats = _extract_stats_fallback(page, "2h")
                stats.update(h2_stats)
        except Exception as e:
            print(f"  [stats/2h] tab click failed: {e}", file=sys.stderr)

    except Exception as e:
        print(f"  [detail] Unexpected error: {e}", file=sys.stderr)
    finally:
        try:
            page.close()
        except Exception:
            pass

    if stats:
        print(f"  [detail] total fields: {len(stats)}", file=sys.stderr)
    else:
        print(f"  [detail] no stats extracted", file=sys.stderr)

    return stats


def load_results_page(page, country: str, slug: str, since: str) -> list:
    """
    Load a Flashscore results page, expand to cover the since date,
    and return all parsed result rows within [since, today).
    """
    url = f"https://www.flashscore.com/football/{country}/{slug}/results/"
    print(f"  Loading {url} ...", file=sys.stderr)
    page.goto(url, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(3000)
    dismiss_popups(page)
    expand_results(page)

    rows = page.locator("[class*='event__match']").all()
    print(f"  Found {len(rows)} rows", file=sys.stderr)

    parsed = []
    for row in rows:
        r = parse_result_row(row)
        if r and date_in_range(r["date_str"], since):
            parsed.append(r)
    return parsed, url


# ---------------------------------------------------------------------------
# Mode: UPDATE — league matches already in v4.matches
# ---------------------------------------------------------------------------

def run_update_mode(page, browser, groups: dict, results_url_cache: dict, force_tier: int = 0) -> list:
    """
    For each target match (from DB), find it on the results page and scrape stats.
    Returns list of { action: "update", match_id, ... }
    Stats are scraped on an isolated page (browser param) so the results page
    is never disrupted by stats navigations.

    Tier is resolved per competition from DB: Tier 1 = full (events+lineups+stats),
    Tier 2 = score only. force_tier=1 overrides and forces Tier 1 for all.
    """
    output = []

    for league_key, target_matches in groups.items():
        country, slug = FLASHSCORE_LEAGUES[league_key]

        # Resolve tier for this competition (one DB call per league key)
        comp_name = target_matches[0]['competition_name'] if target_matches else league_key
        tier = resolve_competition_tier(comp_name, force_tier)
        tier_label = "Full" if tier == 1 else "Score only"
        print(f"\n[update/{league_key}] {len(target_matches)} matches to resolve — {tier_label}", file=sys.stderr)

        try:
            parsed_rows, page_url = load_results_page(page, country, slug,
                                                       min(m['match_date'] for m in target_matches))
            results_url_cache[league_key] = page_url

            dates_needed = {m['match_date'] for m in target_matches}

            for row in parsed_rows:
                if row["date_str"] not in dates_needed:
                    continue
                for tm in target_matches:
                    if tm['match_date'] != row["date_str"]:
                        continue
                    if not (teams_match(row["scraped_home"], tm['home_team']) and
                            teams_match(row["scraped_away"], tm['away_team'])):
                        continue

                    print(
                        f"  MATCH {tm['match_id']} {tm['home_team']} "
                        f"{row['home_score']}-{row['away_score']} {tm['away_team']}",
                        file=sys.stderr
                    )

                    result = {
                        "action":     "update",
                        "match_id":   str(tm['match_id']),  # str to preserve 64-bit precision in JSON
                        "home_score": row["home_score"],
                        "away_score": row["away_score"],
                        "ht_home":    row["ht_home"],
                        "ht_away":    row["ht_away"],
                        "_tier":      tier,
                    }

                    if tier == 1 and row["fs_match_id"]:
                        # Tier 1: scrape full detail (stats + events + lineups)
                        detail = scrape_match_detail(browser, row["fs_match_id"])
                        if detail.get("ht_home") is not None:
                            result["ht_home"] = detail.pop("ht_home")
                            result["ht_away"] = detail.pop("ht_away", None)
                        result.update(detail)
                    elif tier == 2:
                        print(f"  [tier2] score only — detail skipped", file=sys.stderr)
                    else:
                        print(f"  [detail] no fs_match_id — stats skipped", file=sys.stderr)

                    output.append(result)
                    break

        except Exception as e:
            print(f"[update/{league_key}] Failed: {e}", file=sys.stderr)

    return output


# ---------------------------------------------------------------------------
# Mode: DISCOVER — cup matches not pre-imported
# ---------------------------------------------------------------------------

def run_discover_mode(page, browser, cup_filter, since: str, force_tier: int = 0) -> list:
    """
    Scrape cup competition result pages and emit matches to insert.
    Returns list of { action: "insert", fs_key, competition_name, ... }

    Tier is resolved per competition from DB: Tier 1 = full, Tier 2 = score only.
    """
    output = []

    for cup_key, (country, slug) in FLASHSCORE_CUPS.items():
        if cup_filter and cup_filter.lower() not in cup_key.lower():
            continue

        comp_name = CUP_COMPETITION_NAMES[cup_key]
        tier = resolve_competition_tier(comp_name, force_tier)
        tier_label = "Full" if tier == 1 else "Score only"
        print(f"\n[discover/{cup_key}] {comp_name} — {tier_label}", file=sys.stderr)

        try:
            parsed_rows, page_url = load_results_page(page, country, slug, since)
            print(f"  {len(parsed_rows)} results in date range", file=sys.stderr)

            for row in parsed_rows:
                print(
                    f"  {row['date_str']} {row['scraped_home']} "
                    f"{row['home_score']}-{row['away_score']} {row['scraped_away']}",
                    file=sys.stderr
                )

                result = {
                    "action":           "insert",
                    "fs_key":           cup_key,
                    "competition_name": comp_name,
                    "home_team":        row["scraped_home"],
                    "away_team":        row["scraped_away"],
                    "match_date":       row["date_str"],
                    "home_score":       row["home_score"],
                    "away_score":       row["away_score"],
                    "ht_home":          row["ht_home"],
                    "ht_away":          row["ht_away"],
                    "_tier":            tier,
                }

                if tier == 1 and row["fs_match_id"]:
                    detail = scrape_match_detail(browser, row["fs_match_id"])
                    if detail.get("ht_home") is not None:
                        result["ht_home"] = detail.pop("ht_home")
                        result["ht_away"] = detail.pop("ht_away", None)
                    result.update(detail)
                elif tier == 2:
                    print(f"  [tier2] score only — detail skipped", file=sys.stderr)

                output.append(result)

        except Exception as e:
            print(f"[discover/{cup_key}] Failed: {e}", file=sys.stderr)

    return output


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', default='update', choices=['update', 'discover', 'all'])
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--league', default=None, help='Filter competition key')
    parser.add_argument('--since', default=None)
    parser.add_argument('--output', default=None)
    parser.add_argument('--force-tier', type=int, default=0, choices=[0, 1],
                        help='Force tier 1 (Full) for all competitions regardless of DB state')
    parser.add_argument('--match-ids', default=None,
                        help='Comma-separated match_ids to target specifically (for retry)')
    args = parser.parse_args()

    # Parse match_ids filter
    target_match_ids = None
    if args.match_ids:
        target_match_ids = set(int(x.strip()) for x in args.match_ids.split(',') if x.strip())

    since = args.since or (datetime.now() - timedelta(days=15)).strftime('%Y-%m-%d')
    all_results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })

        # ── UPDATE mode: league matches already in v4.matches ───────────────
        if args.mode in ('update', 'all'):
            if args.force_tier == 1:
                # force-tier=1: also pick up scored matches missing events/lineups
                print(f"\n[scraper] MODE=update (force-tier=1) — fetching scored matches without detail since {since}", file=sys.stderr)
                matches = fetch_scored_without_detail(args.league, since)
                print(f"[scraper] {len(matches)} matches need detail", file=sys.stderr)
            else:
                print(f"\n[scraper] MODE=update — fetching unresolved league matches since {since}", file=sys.stderr)
                matches = fetch_unresolved_matches(args.league, since)
                print(f"[scraper] {len(matches)} unresolved matches", file=sys.stderr)

            if matches:
                if target_match_ids:
                    before = len(matches)
                    matches = [m for m in matches if m['match_id'] in target_match_ids]
                    print(f"[scraper] --match-ids filter: {before} → {len(matches)} matches", file=sys.stderr)

                groups = {}  # type: dict
                for m in matches:
                    key = resolve_league_key(m['competition_name'])
                    if not key:
                        print(f"  Unknown competition '{m['competition_name']}' — skipped", file=sys.stderr)
                        continue
                    if args.league and args.league.lower() not in key.lower():
                        continue
                    groups.setdefault(key, []).append(m)

                results = run_update_mode(page, browser, groups, {}, args.force_tier)
                all_results.extend(results)
                print(f"[scraper] update mode: {len(results)} matches resolved", file=sys.stderr)

        # ── DISCOVER mode: cup matches not pre-imported ──────────────────────
        if args.mode in ('discover', 'all'):
            print(f"\n[scraper] MODE=discover — scraping cup results since {since}", file=sys.stderr)
            cup_filter = args.league if args.league else None
            results = run_discover_mode(page, browser, cup_filter, since, args.force_tier)
            all_results.extend(results)
            print(f"[scraper] discover mode: {len(results)} cup matches found", file=sys.stderr)

        browser.close()

    print(f"\n[scraper] Total: {len(all_results)} results", file=sys.stderr)

    output = json.dumps(all_results, indent=2)
    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        print(f"[scraper] Written to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == '__main__':
    main()
