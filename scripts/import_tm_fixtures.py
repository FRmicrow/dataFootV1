#!/usr/bin/env python3
"""
V39 — Transfermarkt Fixture Import
===================================
Importe les rapports de match Transfermarkt (externalData/CoveredLeague/)
directement dans les tables existantes V3_Fixtures et V3_Fixture_Events.

Stratégie de matching des équipes :
- Traitement du plus récent au plus ancien (les saisons récentes ont plus
  de correspondances dans V3_Teams issues d'API-Football)
- Cache cumulatif {nom_normalisé → team_id} enrichi saison par saison
- Fuzzy matching avec difflib (seuil ≥ 0.85)
- Si équipe inconnue → INSERT minimal dans V3_Teams avec data_source='transfermarkt'

Usage :
    python scripts/import_tm_fixtures.py [options]

Options :
    --dry-run               Simuler l'import sans écrire en base
    --league SLUG           Filtrer sur une ligue (ex: bundesliga, laliga)
    --season YYYY-YYYY      Traiter uniquement cette saison
    --from-season YYYY-YYYY Traiter cette saison et toutes les plus anciennes
    --db-url URL            URL de connexion PostgreSQL (défaut: $DATABASE_URL)
    --data-dir PATH         Dossier racine CoveredLeague (défaut: auto-détecté)
    --log-level LEVEL       Niveau de log : DEBUG, INFO, WARNING (défaut: INFO)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from tqdm import tqdm
from unidecode import unidecode

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_DATA_DIR = PROJECT_ROOT / "externalData" / "CoveredLeague"
DATA_SOURCE = "transfermarkt"
TEAM_MATCH_THRESHOLD = 0.85  # Seuil de similarité fuzzy

# Mapping TM folder slug → keywords for V3_Leagues name lookup
# Keys are folder names after stripping 'FixtureDetail' and lowercasing
TM_SLUG_TO_LEAGUE_KEYWORDS: dict[str, list[str]] = {
    "bundesliga":               ["bundesliga", "1. bundesliga"],
    "laliga":                   ["la liga", "laliga", "primera division"],
    "ligue1":                   ["ligue 1", "ligue1"],
    "seriea":                   ["serie a"],
    "premierleague":            ["premier league"],
    "primeiraliga":             ["primeira liga", "liga nos", "liga portugal"],
    "saudiproleague":           ["saudi pro league", "saudi"],
    "turkishsuperlig":          ["super lig", "turkish"],
    "championleague":           ["champions league", "uefa champions"],
    "europaleague":             ["europa league", "uefa europa"],
    "coupedesclubschampions":   ["champions league", "clubs champions"],
    "coupedeuefa":              ["europa league", "uefa cup"],
    "facup":                    ["fa cup"],
    "dfbpokal":                 ["dfb pokal", "dfb-pokal"],
    "coupeitalie":              ["coppa italia"],
    "coupeduroi":               ["copa del rey"],
    "cdf":                      ["coupe de france"],
    "worldcup":                 ["world cup", "fifa world cup"],
    "euro":                     ["european championship", "euro championship"],
    "jupilerleague":            ["jupiler", "pro league", "belgian"],
    "eredivise":                ["eredivisie"],
    "knvbbeker":                ["knvb beker", "knvb"],
    "tacaportugal":             ["taca de portugal", "taca portugal"],
    "crokycup":                 ["croky cup"],
}

# Direct league_id overrides — bypass keyword matching for ambiguous slugs.
# Use when LOWER(name) LIKE matching resolves to wrong league due to shorter/unexpected names.
TM_SLUG_TO_LEAGUE_ID: dict[str, int] = {
    "turkishsuperlig":        37,    # Süper Lig — 'ü' prevents LIKE '%super lig%' from matching
    "championleague":         1475,  # UEFA Champions League — shorter 'AFC Champions League' would win
    "coupedesclubschampions": 1475,  # UEFA Champions League — same ambiguity
}


# Mapping folder name → clean slug (strip 'FixtureDetail' suffix, lowercase)
def folder_to_slug(folder_name: str) -> str:
    return folder_name.replace("FixtureDetail", "").lower()


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def setup_logging(level: str) -> logging.Logger:
    logging.basicConfig(
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
        level=getattr(logging, level.upper(), logging.INFO),
    )
    return logging.getLogger("tm_import")


# ---------------------------------------------------------------------------
# Text normalisation for fuzzy team name matching
# ---------------------------------------------------------------------------

_NON_ALPHA = re.compile(r"[^a-z0-9 ]")

def normalize_name(name: str) -> str:
    """Lowercase, remove accents, strip non-alphanumeric chars."""
    return _NON_ALPHA.sub("", unidecode(name).lower()).strip()


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


# ---------------------------------------------------------------------------
# Date parsing
# ---------------------------------------------------------------------------

_FR_MONTHS = {
    # Full names
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "août": 8, "aout": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12, "decembre": 12,
    # Abbreviated forms (TM old format: 'sam., 7 sept. 1963')
    "janv": 1, "févr": 2, "fevr": 2, "avr": 4,
    "juil": 7, "sept": 9, "oct": 10, "nov": 11, "déc": 12, "dec": 12,
}

def parse_date(raw: str) -> datetime | None:
    """Parse dates from Transfermarkt _parser.date field.
    Handles: 'ven., 07/08/2009', 'sam., 24 août 1963', 'yyyy-mm-dd'.
    """
    if not raw:
        return None
    # dd/mm/yyyy
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", raw)
    if m:
        try:
            return datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        except ValueError:
            pass
    # yyyy-mm-dd
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", raw)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass
    # French literal: "sam., 24 août 1963", "7 sept. 1963", "1 févr. 1964"
    m = re.search(r"(\d{1,2})\s+([a-zéûôè]+)\.?\s+(\d{4})", raw.lower())
    if m:
        month_num = _FR_MONTHS.get(m.group(2))
        if month_num:
            try:
                return datetime(int(m.group(3)), month_num, int(m.group(1)))
            except ValueError:
                pass
    return None


def season_start_year(season_label: str) -> int:
    """Extract start year from '2009-2010' → 2009."""
    try:
        return int(season_label.split("-")[0])
    except (ValueError, IndexError):
        return 0


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

class Stats:
    def __init__(self):
        self.files_read = 0
        self.fixtures_inserted = 0
        self.fixtures_enriched = 0
        self.fixtures_skipped = 0
        self.events_inserted = 0
        self.teams_created = 0
        self.errors = 0

    def summary(self) -> str:
        return (
            f"Files read: {self.files_read} | "
            f"Fixtures inserted: {self.fixtures_inserted} | "
            f"Fixtures enriched: {self.fixtures_enriched} | "
            f"Fixtures skipped: {self.fixtures_skipped} | "
            f"Events inserted: {self.events_inserted} | "
            f"Teams created: {self.teams_created} | "
            f"Errors: {self.errors}"
        )


class TeamCache:
    """Persistent cross-season fuzzy name cache for V3_Teams."""

    def __init__(self, cur, log: logging.Logger):
        self._cur = cur
        self._log = log
        # {normalized_name: team_id}
        self._cache: dict[str, int] = {}
        self._load_all()

    def _load_all(self):
        self._cur.execute("SELECT team_id, name FROM V3_Teams")
        for row in self._cur.fetchall():
            key = normalize_name(row["name"])
            self._cache[key] = row["team_id"]
        self._log.debug(f"TeamCache loaded {len(self._cache)} teams from DB")

    def get(self, raw_name: str) -> int | None:
        key = normalize_name(raw_name)
        # Exact match first
        if key in self._cache:
            return self._cache[key]
        # Fuzzy match
        best_score, best_id, best_key = 0.0, None, None
        for cached_key, team_id in self._cache.items():
            score = similarity(key, cached_key)
            if score > best_score:
                best_score, best_id, best_key = score, team_id, cached_key
        if best_score >= TEAM_MATCH_THRESHOLD:
            self._log.debug(
                f"Fuzzy match '{raw_name}' → '{best_key}' (score={best_score:.2f})"
            )
            # Register under the TM name to speed up future lookups
            self._cache[key] = best_id
            return best_id
        # Last resort: distinctive token match.
        # Two team names sharing the same long distinctive word (>7 chars, e.g.
        # "monchengladbach") are likely the same club with different prefixes
        # ("1.FC Monchengladbach" vs "Borussia Mönchengladbach").
        distinctive = [t for t in key.split() if len(t) > 7]
        if distinctive:
            for cached_key, team_id in self._cache.items():
                cached_tokens = set(cached_key.split())
                if any(d in cached_tokens for d in distinctive):
                    self._log.debug(
                        f"Token match '{raw_name}' → '{cached_key}' via "
                        f"distinctive token"
                    )
                    self._cache[key] = team_id
                    return team_id
        return None

    def register(self, raw_name: str, team_id: int):
        self._cache[normalize_name(raw_name)] = team_id


class Importer:
    def __init__(self, conn, dry_run: bool, log: logging.Logger):
        self._conn = conn
        self._dry_run = dry_run
        self._log = log
        self._stats = Stats()
        self._cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        self._team_cache = TeamCache(self._cur, log)
        # {slug: league_id | None}
        self._league_id_cache: dict[str, int | None] = {}

    # ------------------------------------------------------------------
    # League resolution
    # ------------------------------------------------------------------

    def _resolve_league_id(self, slug: str) -> int | None:
        if slug in self._league_id_cache:
            return self._league_id_cache[slug]

        # Direct override — bypass keyword matching for ambiguous slugs
        if slug in TM_SLUG_TO_LEAGUE_ID:
            league_id = TM_SLUG_TO_LEAGUE_ID[slug]
            self._log.debug(f"Direct override: '{slug}' → league_id={league_id}")
            self._league_id_cache[slug] = league_id
            return league_id

        keywords = TM_SLUG_TO_LEAGUE_KEYWORDS.get(slug, [slug])
        league_id = None
        for kw in keywords:
            self._cur.execute(
                "SELECT league_id FROM V3_Leagues WHERE LOWER(name) LIKE %s ORDER BY LENGTH(name) ASC, league_id ASC LIMIT 1",
                (f"%{kw}%",),
            )
            row = self._cur.fetchone()
            if row:
                league_id = row["league_id"]
                break

        if league_id is None:
            self._log.debug(f"No V3_Leagues match for slug '{slug}'")
        else:
            self._log.debug(f"Resolved league '{slug}' → league_id={league_id}")

        self._league_id_cache[slug] = league_id
        return league_id

    def _upsert_league_season(self, league_id: int, season_year: int):
        """Ensure V3_League_Seasons has an entry with imported_fixtures=TRUE."""
        if self._dry_run or not league_id:
            return
        self._cur.execute(
            """
            INSERT INTO V3_League_Seasons (league_id, season_year, imported_fixtures)
            VALUES (%s, %s, TRUE)
            ON CONFLICT (league_id, season_year)
            DO UPDATE SET imported_fixtures = TRUE
            """,
            (league_id, season_year),
        )
        self._conn.commit()

    # ------------------------------------------------------------------
    # Team resolution
    # ------------------------------------------------------------------

    def _resolve_or_create_team(self, name: str, logo_url: str | None) -> int:
        team_id = self._team_cache.get(name)
        if team_id:
            return team_id

        # Create minimal team entry
        self._log.info(f"Creating new team: '{name}'")
        if not self._dry_run:
            self._cur.execute(
                """
                INSERT INTO V3_Teams (name, logo_url, data_source)
                VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING
                RETURNING team_id
                """,
                (name, logo_url, DATA_SOURCE),
            )
            row = self._cur.fetchone()
            if row:
                team_id = row["team_id"]
                self._team_cache.register(name, team_id)
                self._stats.teams_created += 1
                return team_id
            # May have been inserted by a concurrent run — reload
            self._cur.execute("SELECT team_id FROM V3_Teams WHERE name = %s", (name,))
            row = self._cur.fetchone()
            if row:
                team_id = row["team_id"]
                self._team_cache.register(name, team_id)
                return team_id
        else:
            # Dry-run: assign a synthetic negative id
            fake_id = -(abs(hash(name)) % 999999 + 1)
            self._team_cache.register(name, fake_id)
            self._stats.teams_created += 1
            return fake_id

        raise RuntimeError(f"Could not resolve or create team: {name}")

    # ------------------------------------------------------------------
    # Fixture resolution
    # ------------------------------------------------------------------

    def _resolve_fixture(
        self,
        tm_match_id: str,
        home_team_id: int,
        away_team_id: int,
        match_date: datetime | None,
        league_slug: str,
        season_label: str,
    ) -> tuple[int | None, bool]:
        """Returns (fixture_id, is_new). is_new=True if we inserted a new row."""

        # 1. Already imported by tm_match_id?
        self._cur.execute(
            "SELECT fixture_id FROM V3_Fixtures WHERE tm_match_id = %s",
            (tm_match_id,),
        )
        row = self._cur.fetchone()
        if row:
            return row["fixture_id"], False

        # 2. Match by teams + date (existing API-Football fixture)?
        if match_date and home_team_id > 0 and away_team_id > 0:
            self._cur.execute(
                """
                SELECT fixture_id FROM V3_Fixtures
                WHERE home_team_id = %s
                  AND away_team_id = %s
                  AND date::date BETWEEN %s::date - INTERVAL '1 day'
                                    AND %s::date + INTERVAL '1 day'
                LIMIT 1
                """,
                (home_team_id, away_team_id, match_date, match_date),
            )
            row = self._cur.fetchone()
            if row:
                return row["fixture_id"], False

        return None, True

    def _update_fixture_tm(
        self,
        fixture_id: int,
        tm_match_id: str,
        home_logo_url: str | None,
        away_logo_url: str | None,
        match_date: "datetime | None" = None,
    ):
        if self._dry_run:
            return
        self._cur.execute(
            """
            UPDATE V3_Fixtures
            SET tm_match_id   = COALESCE(tm_match_id, %s),
                home_logo_url = COALESCE(home_logo_url, %s),
                away_logo_url = COALESCE(away_logo_url, %s),
                date          = COALESCE(date, %s)
            WHERE fixture_id  = %s
            """,
            (tm_match_id, home_logo_url, away_logo_url, match_date, fixture_id),
        )

    def _insert_fixture(
        self,
        tm_match_id: str,
        league_slug: str,
        season_label: str,
        competition: str | None,
        match_date: datetime | None,
        date_raw: str | None,
        home_team_id: int,
        away_team_id: int,
        home_team_name: str,
        away_team_name: str,
        home_logo_url: str | None,
        away_logo_url: str | None,
        home_goals: int | None,
        away_goals: int | None,
        venue_name: str | None,
        referee: str | None,
        home_formation: str | None,
        away_formation: str | None,
        home_coach: str | None,
        away_coach: str | None,
        events_count: int,
        source_file: str,
    ) -> int | None:
        """Insert a new V3_Fixtures row for a TM-only fixture."""
        if self._dry_run:
            return None

        season_year = season_start_year(season_label)

        league_id = self._resolve_league_id(league_slug)
        if league_id is None:
            self._log.warning(f"League not found for slug '{league_slug}', skipping fixture insert")
            self._stats.fixtures_skipped += 1
            return None

        self._cur.execute(
            """
            INSERT INTO V3_Fixtures (
                api_id, league_id, season_year,
                home_team_id, away_team_id,
                goals_home, goals_away,
                score_fulltime_home, score_fulltime_away,
                date, referee,
                data_source, tm_match_id,
                home_logo_url, away_logo_url,
                status_short, status_long
            ) VALUES (
                NULL, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                'FT', 'Match Finished'
            )
            ON CONFLICT (tm_match_id) WHERE tm_match_id IS NOT NULL DO NOTHING
            RETURNING fixture_id
            """,
            (
                league_id, season_year,
                home_team_id, away_team_id,
                home_goals, away_goals,
                home_goals, away_goals,
                match_date, referee,
                DATA_SOURCE, tm_match_id,
                home_logo_url, away_logo_url,
            ),
        )
        row = self._cur.fetchone()
        return row["fixture_id"] if row else None

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------

    def _insert_events(self, fixture_id: int, events: list[dict]):
        if self._dry_run or not events:
            return 0
        # Delete existing TM events to allow re-import with updated fields (e.g. side)
        self._cur.execute(
            "DELETE FROM V3_Fixture_Events WHERE fixture_id = %s AND data_source = %s",
            (fixture_id, DATA_SOURCE),
        )
        count = 0
        for ev in events:
            minute_str = ev.get("minute") or ""
            try:
                minute = int(re.sub(r"[^0-9]", "", minute_str)) if minute_str else None
            except ValueError:
                minute = None

            ev_type = ev.get("type", "").lower()
            side = ev.get("side")  # "home" or "away"

            if ev_type == "goal":
                player_name = ev.get("but")
                player2_name = ev.get("passe")
                goal_type = ev.get("goal_type")
                score_snapshot = ev.get("score")
                detail = goal_type
            elif ev_type == "card":
                player_name = ev.get("joueur")
                player2_name = None
                score_snapshot = None
                detail = ev.get("detail")
            elif ev_type == "substitution":
                player_name = ev.get("joueur_out")
                player2_name = ev.get("joueur_in")
                score_snapshot = None
                detail = ev.get("detail")
            else:
                continue  # Skip unknown event types

            self._cur.execute(
                """
                INSERT INTO V3_Fixture_Events (
                    fixture_id, time_elapsed, type, detail,
                    player_name, assist_name, comments,
                    side, data_source
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    fixture_id,
                    minute,
                    ev_type,
                    detail,
                    player_name,
                    player2_name,
                    score_snapshot,
                    side,
                    DATA_SOURCE,
                ),
            )
            count += 1
        return count

    def _insert_lineups(
        self,
        fixture_id: int,
        home_team_id: int,
        away_team_id: int,
        home_lineup: dict,
        away_lineup: dict,
    ):
        """Insert/upsert lineups into V3_Fixture_Lineups from TM data."""
        if self._dry_run:
            return

        role_map = {"G": "GK", "D": "D", "M": "M", "A": "F"}

        def make_entry(p: dict, idx: int) -> dict:
            return {
                "player_id": f"tm_{idx}_{normalize_name(p.get('name', str(idx)))}",
                "player": {
                    "id": None,
                    "name": p.get("name", ""),
                    "number": p.get("numero") or "",
                    "pos": role_map.get(p.get("role", ""), p.get("role", "")),
                },
            }

        for team_id, lineup in ((home_team_id, home_lineup), (away_team_id, away_lineup)):
            if not lineup or team_id <= 0:
                continue

            starters = [
                make_entry(p, i) for i, p in enumerate(lineup.get("titulaires", []))
            ]
            subs = [
                make_entry(p, i) for i, p in enumerate(lineup.get("remplacants", []))
            ]

            self._cur.execute(
                """
                INSERT INTO V3_Fixture_Lineups
                    (fixture_id, team_id, formation, coach_name, starting_xi, substitutes)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (fixture_id, team_id) DO UPDATE
                    SET formation   = COALESCE(EXCLUDED.formation,   V3_Fixture_Lineups.formation),
                        coach_name  = COALESCE(EXCLUDED.coach_name,  V3_Fixture_Lineups.coach_name),
                        starting_xi = CASE
                            WHEN V3_Fixture_Lineups.starting_xi IS NULL
                              OR V3_Fixture_Lineups.starting_xi = '[]'
                            THEN EXCLUDED.starting_xi
                            ELSE V3_Fixture_Lineups.starting_xi
                            END,
                        substitutes = CASE
                            WHEN V3_Fixture_Lineups.substitutes IS NULL
                              OR V3_Fixture_Lineups.substitutes = '[]'
                            THEN EXCLUDED.substitutes
                            ELSE V3_Fixture_Lineups.substitutes
                            END
                """,
                (
                    fixture_id,
                    team_id,
                    lineup.get("composition"),
                    lineup.get("entraineur"),
                    json.dumps(starters, ensure_ascii=False),
                    json.dumps(subs, ensure_ascii=False),
                ),
            )

    # ------------------------------------------------------------------
    # Single file processing
    # ------------------------------------------------------------------

    def process_file(self, json_path: Path, league_slug: str, season_label: str):
        self._stats.files_read += 1
        try:
            with open(json_path, encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError) as e:
            self._log.warning(f"Cannot read {json_path.name}: {e}")
            self._stats.errors += 1
            return

        parser = data.get("_parser", {})
        if parser.get("status") != "ok":
            self._stats.fixtures_skipped += 1
            return

        scorebox = data.get("scorebox", {})
        home_name = scorebox.get("home_team", "")
        away_name = scorebox.get("away_team", "")
        if not home_name or not away_name:
            self._stats.fixtures_skipped += 1
            return

        tm_match_id = parser.get("match_id")
        if not tm_match_id:
            self._stats.fixtures_skipped += 1
            return

        date_raw = parser.get("date", "")
        match_date = parse_date(date_raw)
        home_logo = scorebox.get("home_logo_url")
        away_logo = scorebox.get("away_logo_url")

        # Resolve teams
        home_team_id = self._resolve_or_create_team(home_name, home_logo)
        away_team_id = self._resolve_or_create_team(away_name, away_logo)

        lineups = data.get("lineups", {})
        home_lineup = lineups.get("home", {})
        away_lineup = lineups.get("away", {})

        source_file = str(json_path.relative_to(PROJECT_ROOT))

        fixture_id, is_new = self._resolve_fixture(
            tm_match_id, home_team_id, away_team_id, match_date, league_slug, season_label
        )

        if is_new:
            fixture_id = self._insert_fixture(
                tm_match_id=tm_match_id,
                league_slug=league_slug,
                season_label=season_label,
                competition=parser.get("competition"),
                match_date=match_date,
                date_raw=date_raw,
                home_team_id=home_team_id,
                away_team_id=away_team_id,
                home_team_name=home_name,
                away_team_name=away_name,
                home_logo_url=home_logo,
                away_logo_url=away_logo,
                home_goals=scorebox.get("home_goals"),
                away_goals=scorebox.get("away_goals"),
                venue_name=parser.get("venue"),
                referee=parser.get("referee"),
                home_formation=home_lineup.get("composition"),
                away_formation=away_lineup.get("composition"),
                home_coach=home_lineup.get("entraineur"),
                away_coach=away_lineup.get("entraineur"),
                events_count=data.get("events_count", 0),
                source_file=source_file,
            )
            if fixture_id:
                self._stats.fixtures_inserted += 1
            else:
                self._stats.fixtures_skipped += 1
                return
        else:
            if fixture_id:
                self._update_fixture_tm(fixture_id, tm_match_id, home_logo, away_logo, match_date)
                self._stats.fixtures_enriched += 1
            else:
                self._stats.fixtures_skipped += 1
                return

        # Insert events (with side for home/away timeline positioning)
        events = data.get("events", [])
        n = self._insert_events(fixture_id, events)
        self._stats.events_inserted += n

        # Insert lineups
        self._insert_lineups(
            fixture_id,
            home_team_id,
            away_team_id,
            home_lineup,
            away_lineup,
        )

        if not self._dry_run:
            self._conn.commit()

    # ------------------------------------------------------------------
    # Public: run full import
    # ------------------------------------------------------------------

    def run(
        self,
        data_dir: Path,
        league_filter: str | None,
        season_filter: str | None,
        from_season: str | None,
        to_season: str | None = None,
    ):
        # Discover league folders
        league_folders = sorted(
            [d for d in data_dir.iterdir() if d.is_dir()],
            key=lambda d: d.name,
        )

        for league_folder in league_folders:
            slug = folder_to_slug(league_folder.name)

            if league_filter and slug != league_filter.lower():
                continue

            # Sort seasons most-recent first
            season_dirs = sorted(
                [d for d in league_folder.iterdir() if d.is_dir()],
                key=lambda d: d.name,
                reverse=True,
            )

            for season_dir in season_dirs:
                season_label = season_dir.name

                # Season filters
                if season_filter and season_label != season_filter:
                    continue
                if from_season:
                    if season_start_year(season_label) > season_start_year(from_season):
                        continue  # Skip seasons newer than from_season
                if to_season:
                    if season_start_year(season_label) > season_start_year(to_season):
                        continue  # Skip seasons newer than to_season

                json_files = sorted(season_dir.glob("*.json"))
                if not json_files:
                    continue

                self._log.info(
                    f"Processing {slug}/{season_label} — {len(json_files)} files"
                )

                fixtures_before = self._stats.fixtures_inserted + self._stats.fixtures_enriched

                for json_path in tqdm(
                    json_files,
                    desc=f"{slug}/{season_label}",
                    unit="file",
                    leave=False,
                ):
                    self.process_file(json_path, slug, season_label)

                # Register season in V3_League_Seasons if at least one fixture was processed
                fixtures_after = self._stats.fixtures_inserted + self._stats.fixtures_enriched
                if fixtures_after > fixtures_before:
                    league_id = self._resolve_league_id(slug)
                    if league_id:
                        season_year = season_start_year(season_label)
                        self._upsert_league_season(league_id, season_year)
                        self._log.info(
                            f"V3_League_Seasons updated: league_id={league_id}, season_year={season_year}"
                        )

        self._log.info(f"Import complete: {self._stats.summary()}")

    @property
    def stats(self) -> Stats:
        return self._stats


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Import Transfermarkt fixture data into V3_Fixtures and V3_Fixture_Events"
    )
    parser.add_argument("--dry-run", action="store_true", help="Simulate without writing to DB")
    parser.add_argument("--league", help="Filter by league slug (e.g. bundesliga)")
    parser.add_argument("--season", help="Import only this season (YYYY-YYYY)")
    parser.add_argument("--from-season", dest="from_season", help="Import from this season backwards (YYYY-YYYY)")
    parser.add_argument("--to-season", dest="to_season", help="Import up to this season only (YYYY-YYYY), skip newer")
    parser.add_argument("--db-url", help="PostgreSQL connection URL (default: $DATABASE_URL)")
    parser.add_argument("--data-dir", help="Path to CoveredLeague directory")
    parser.add_argument("--log-level", default="INFO", help="Log level (default: INFO)")
    args = parser.parse_args()

    log = setup_logging(args.log_level)

    # Resolve DATABASE_URL
    load_dotenv(PROJECT_ROOT / "backend" / ".env")
    db_url = args.db_url or os.environ.get("DATABASE_URL")
    if not db_url:
        log.error("DATABASE_URL not set. Use --db-url or set DATABASE_URL in backend/.env")
        sys.exit(1)

    # For local use outside Docker: replace host 'db' with 'localhost'
    if "@db:" in db_url and "localhost" not in db_url:
        local_url = db_url.replace("@db:", "@localhost:")
        log.info(f"Adapting DB host: db → localhost")
        db_url = local_url

    data_dir = Path(args.data_dir) if args.data_dir else DEFAULT_DATA_DIR
    if not data_dir.is_dir():
        log.error(f"Data directory not found: {data_dir}")
        sys.exit(1)

    if args.dry_run:
        log.info("DRY-RUN mode — no writes to database")

    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = False
    except psycopg2.OperationalError as e:
        log.error(f"Cannot connect to database: {e}")
        sys.exit(1)

    try:
        importer = Importer(conn, dry_run=args.dry_run, log=log)
        importer.run(
            data_dir=data_dir,
            league_filter=args.league,
            season_filter=args.season,
            from_season=args.from_season,
            to_season=args.to_season,
        )
    except KeyboardInterrupt:
        log.warning("Interrupted by user")
        conn.rollback()
    except Exception as e:
        log.error(f"Unexpected error: {e}", exc_info=True)
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
