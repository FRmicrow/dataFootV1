"""
features/builder.py — Per-League ELO, Form, Fatigue, Discipline, H2H & Odds Features
======================================================================================

US_024 implementation.

ANTI-LEAKAGE GUARANTEE
-----------------------
Every SQL query that touches historical data includes:
    AND date < '{fixture_date}'
or equivalent parameter.  This ensures features computed for a fixture with
date D only see matches completed *strictly before* D — no future data ever
bleeds into training or inference.

ELO DESIGN
-----------
• ELO is per-league (different competitions have their own rating timelines).
• Starting ELO = 1500 for every team in every league.
• K-factor = 20 (season-agnostic, applied after every FT/AET/PEN result).
• Home advantage = +100 ELO points added inside the expected-score formula.
• The `recent_form_score` captures momentum across all competitions
  (but ELO itself stays league-scoped).

PUBLIC API
----------
build_features(fixture_id, fixture_date, home_team_id, away_team_id, league_id)
    → dict with ~35 named features, ready to be a DataFrame row.

build_elo_ratings(league_id, up_to_date)
    → dict { team_id: elo_float } for the requested league up to (not including)
      up_to_date.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd

from config import ELO_K_FACTOR, ELO_HOME_ADVANTAGE, ELO_START, FORM_WINDOW
from db.reader import fetch_df, fetch_all
from db.writer import save_feature_batch, delete_league_features

logger = logging.getLogger(__name__)

# ── Internal helpers ──────────────────────────────────────────────────────────


def _expected_score(rating_a: float, rating_b: float, home_advantage: float = ELO_HOME_ADVANTAGE) -> float:
    """
    Standard Elo expected score for player A given ratings a and b.
    Home advantage is added directly to `rating_a` (home team) before computation.
    """
    return 1.0 / (1.0 + 10 ** ((rating_b - (rating_a + home_advantage)) / 400.0))


def _update_elo(
    home_elo: float,
    away_elo: float,
    goals_home: int,
    goals_away: int,
    k: float = ELO_K_FACTOR,
) -> tuple[float, float]:
    """Return updated (home_elo, away_elo) after one match result."""
    e_home = _expected_score(home_elo, away_elo)
    e_away = 1.0 - e_home

    if goals_home > goals_away:
        s_home, s_away = 1.0, 0.0
    elif goals_home < goals_away:
        s_home, s_away = 0.0, 1.0
    else:
        s_home, s_away = 0.5, 0.5

    return (
        home_elo + k * (s_home - e_home),
        away_elo + k * (s_away - e_away),
    )


# ── Public ELO builder ────────────────────────────────────────────────────────


def build_elo_ratings(league_id: int, up_to_date: str) -> dict[int, float]:
    """
    Replay all completed matches for `league_id` up to (not including)
    `up_to_date` and return a dict {team_id: elo}.

    Anti-leakage: WHERE date < up_to_date is baked into the SQL.
    """
    sql = """
        SELECT
            home_team_id,
            away_team_id,
            goals_home,
            goals_away,
            date
        FROM V3_Fixtures
        WHERE
            league_id = ?
            AND status_short IN ('FT', 'AET', 'PEN')
            AND goals_home IS NOT NULL
            AND goals_away IS NOT NULL
            AND date < ?
        ORDER BY date ASC
    """
    df = fetch_df(sql, (league_id, up_to_date))

    ratings: dict[int, float] = {}

    for _, row in df.iterrows():
        h_id = int(row["home_team_id"])
        a_id = int(row["away_team_id"])

        h_elo = ratings.get(h_id, ELO_START)
        a_elo = ratings.get(a_id, ELO_START)

        new_h, new_a = _update_elo(h_elo, a_elo, int(row["goals_home"]), int(row["goals_away"]))
        ratings[h_id] = new_h
        ratings[a_id] = new_a

    return ratings


# ── Form features ─────────────────────────────────────────────────────────────


def _team_form(team_id: int, fixture_date: str, league_id: int, window: int = FORM_WINDOW) -> dict:
    """
    Rolling stats for the last `window` *completed league* matches
    played by `team_id` strictly before `fixture_date`.
    """
    sql = """
        SELECT
            goals_home,
            goals_away,
            home_team_id,
            away_team_id
        FROM V3_Fixtures
        WHERE
            league_id = ?
            AND status_short IN ('FT', 'AET', 'PEN')
            AND goals_home IS NOT NULL
            AND goals_away IS NOT NULL
            AND date < ?
            AND (home_team_id = ? OR away_team_id = ?)
        ORDER BY date DESC
        LIMIT ?
    """
    df = fetch_df(sql, (league_id, fixture_date, team_id, team_id, window))

    prefix = "home" if team_id == team_id else "team"  # dynamic prefix applied by caller

    if df.empty:
        return {
            "form_pts": 0.0,
            "goal_diff_5": 0,
            "clean_sheet_rate": 0.0,
            "btts_rate": 0.0,
            "over25_rate": 0.0,
        }

    points, gf_list, ga_list, cs_list, btts_list, over25_list = [], [], [], [], [], []

    for _, row in df.iterrows():
        is_home = int(row["home_team_id"]) == team_id
        gf = int(row["goals_home"]) if is_home else int(row["goals_away"])
        ga = int(row["goals_away"]) if is_home else int(row["goals_home"])

        pts = 3 if gf > ga else (1 if gf == ga else 0)
        total = gf + ga

        points.append(pts)
        gf_list.append(gf)
        ga_list.append(ga)
        cs_list.append(1 if ga == 0 else 0)
        btts_list.append(1 if (gf > 0 and ga > 0) else 0)
        over25_list.append(1 if total > 2.5 else 0)

    n = len(points)
    return {
        "form_pts": sum(points) / n,
        "goal_diff_5": sum(gf_list) - sum(ga_list),
        "clean_sheet_rate": sum(cs_list) / n,
        "btts_rate": sum(btts_list) / n,
        "over25_rate": sum(over25_list) / n,
    }


# ── Fatigue / rest features ───────────────────────────────────────────────────


def _team_fatigue(team_id: int, fixture_date: str) -> dict:
    """
    Days since the team's last competitive match (all competitions)
    and number of matches played in the last 30 days — before fixture_date.
    """
    sql_last = """
        SELECT date
        FROM V3_Fixtures
        WHERE
            (home_team_id = ? OR away_team_id = ?)
            AND status_short IN ('FT', 'AET', 'PEN')
            AND date < ?
        ORDER BY date DESC
        LIMIT 1
    """
    sql_30d = """
        SELECT COUNT(*) AS cnt
        FROM V3_Fixtures
        WHERE
            (home_team_id = ? OR away_team_id = ?)
            AND status_short IN ('FT', 'AET', 'PEN')
            AND date >= ?
            AND date < ?
    """
    cutoff_30d = (
        datetime.strptime(fixture_date, "%Y-%m-%d") - timedelta(days=30)
    ).strftime("%Y-%m-%d")

    last_df = fetch_df(sql_last, (team_id, team_id, fixture_date))
    cnt_df = fetch_df(sql_30d, (team_id, team_id, cutoff_30d, fixture_date))

    rest_days: Optional[int] = None
    if not last_df.empty and last_df.iloc[0]["date"]:
        try:
            last_date = datetime.strptime(str(last_df.iloc[0]["date"])[:10], "%Y-%m-%d")
            fix_date = datetime.strptime(fixture_date, "%Y-%m-%d")
            rest_days = (fix_date - last_date).days
        except Exception:
            rest_days = None

    matches_30d = int(cnt_df.iloc[0]["cnt"]) if not cnt_df.empty else 0

    return {
        "rest_days": rest_days,
        "matches_last_30d": matches_30d,
    }


# ── Discipline / style features ───────────────────────────────────────────────


def _team_discipline(team_id: int, fixture_date: str, league_id: int, window: int = FORM_WINDOW) -> dict:
    """
    Average cards and corners over the last `window` league matches.
    Falls back to NULL if data is unavailable (LightGBM handles NaN natively).
    """
    # Cards from V3_Fixture_Events if available
    sql_cards = """
        SELECT
            f.fixture_id,
            SUM(CASE WHEN e.type = 'Card' THEN 1 ELSE 0 END) AS cards
        FROM V3_Fixtures f
        LEFT JOIN V3_Fixture_Events e
            ON e.fixture_id = f.fixture_id
            AND e.team_id = ?
        WHERE
            f.league_id = ?
            AND f.status_short IN ('FT', 'AET', 'PEN')
            AND f.date < ?
            AND (f.home_team_id = ? OR f.away_team_id = ?)
        GROUP BY f.fixture_id
        ORDER BY f.date DESC
        LIMIT ?
    """
    try:
        df = fetch_df(sql_cards, (team_id, league_id, fixture_date, team_id, team_id, window))
        avg_cards = float(df["cards"].mean()) if not df.empty else None
    except Exception:
        avg_cards = None

    # Corners from V3_Fixture_Events (using detail field like 'Normal Goal' is not helpful;
    # corner kicks are not stored per-event in our schema, so we default to None.
    # This feature is a future enhancement once we store fixture statistics.
    avg_corners = None

    return {
        "avg_cards_5": avg_cards,
        "avg_corners_5": avg_corners,
    }


# ── Head-to-Head features ─────────────────────────────────────────────────────


def _h2h_features(home_team_id: int, away_team_id: int, fixture_date: str, window: int = 5) -> dict:
    """
    Stats from the last `window` meetings between two teams
    (both home and away orderings) before `fixture_date`.
    """
    sql = """
        SELECT
            goals_home,
            goals_away,
            home_team_id,
            away_team_id
        FROM V3_Fixtures
        WHERE
            status_short IN ('FT', 'AET', 'PEN')
            AND goals_home IS NOT NULL
            AND date < ?
            AND (
                (home_team_id = ? AND away_team_id = ?)
                OR
                (home_team_id = ? AND away_team_id = ?)
            )
        ORDER BY date DESC
        LIMIT ?
    """
    df = fetch_df(sql, (fixture_date, home_team_id, away_team_id, away_team_id, home_team_id, window))

    if df.empty:
        return {
            "h2h_home_wins": 0,
            "h2h_draws": 0,
            "h2h_away_wins": 0,
            "h2h_avg_goals": None,
        }

    home_wins = draws = away_wins = 0
    goals_totals = []

    for _, row in df.iterrows():
        gh = int(row["goals_home"])
        ga = int(row["goals_away"])
        goals_totals.append(gh + ga)

        # Reframe: perspective = the upcoming home team
        is_home_perspective = int(row["home_team_id"]) == home_team_id
        if is_home_perspective:
            if gh > ga:
                home_wins += 1
            elif gh == ga:
                draws += 1
            else:
                away_wins += 1
        else:
            if ga > gh:
                home_wins += 1
            elif ga == gh:
                draws += 1
            else:
                away_wins += 1

    return {
        "h2h_home_wins": home_wins,
        "h2h_draws": draws,
        "h2h_away_wins": away_wins,
        "h2h_avg_goals": sum(goals_totals) / len(goals_totals) if goals_totals else None,
    }


# ── Odds-derived features ─────────────────────────────────────────────────────


def _odds_features(fixture_id: int) -> dict:
    """
    Fetch bookmaker odds for the fixture and compute implied probabilities.
    Returns NULLs if no odds are available — LightGBM handles NaN natively.

    Market 1 = 1X2 (home/draw/away).
    """
    sql = """
        SELECT
            value_home_over   AS odds_home,
            value_draw        AS odds_draw,
            value_away_under  AS odds_away
        FROM V3_Odds
        WHERE fixture_id = ?
          AND market_id = 1
        ORDER BY id ASC
        LIMIT 1
    """
    try:
        df = fetch_df(sql, (fixture_id,))
    except Exception:
        return {
            "odds_home": None, "odds_draw": None, "odds_away": None,
            "implied_prob_home": None, "implied_prob_draw": None, "implied_prob_away": None,
        }

    if df.empty:
        return {
            "odds_home": None, "odds_draw": None, "odds_away": None,
            "implied_prob_home": None, "implied_prob_draw": None, "implied_prob_away": None,
        }

    row = df.iloc[0]
    oh = float(row["odds_home"]) if row["odds_home"] else None
    od = float(row["odds_draw"]) if row["odds_draw"] else None
    oa = float(row["odds_away"]) if row["odds_away"] else None

    # Margin-adjusted implied probabilities
    if oh and od and oa:
        raw = 1 / oh + 1 / od + 1 / oa
        iph = (1 / oh) / raw
        ipd = (1 / od) / raw
        ipa = (1 / oa) / raw
    else:
        iph = ipd = ipa = None

    return {
        "odds_home": oh,
        "odds_draw": od,
        "odds_away": oa,
        "implied_prob_home": iph,
        "implied_prob_draw": ipd,
        "implied_prob_away": ipa,
    }


# ── Main public function ──────────────────────────────────────────────────────


def build_features(
    fixture_id: int,
    fixture_date: str,
    home_team_id: int,
    away_team_id: int,
    league_id: int,
) -> dict:
    """
    Build the full ~35-feature vector for a single fixture.

    Parameters
    ----------
    fixture_id    : Internal fixture_id (used for odds lookup).
    fixture_date  : ISO date string "YYYY-MM-DD". ALL features are computed
                    using only data strictly before this date (anti-leakage).
    home_team_id  : Internal team ID of the home team.
    away_team_id  : Internal team ID of the away team.
    league_id     : Internal league ID (ELO is scoped to this league).

    Returns
    -------
    dict with keys documented in the feature contract (US_024 AC 8).
    Features are `None` where data is genuinely absent — never imputed here.
    """
    logger.debug(
        "Building features for fixture=%d date=%s home=%d away=%d league=%d",
        fixture_id, fixture_date, home_team_id, away_team_id, league_id,
    )

    # 1. ELO ratings (league-scoped, anti-leakage enforced in SQL)
    elo_ratings = build_elo_ratings(league_id, fixture_date)
    elo_home = elo_ratings.get(home_team_id, ELO_START)
    elo_away = elo_ratings.get(away_team_id, ELO_START)
    elo_diff = elo_home - elo_away

    # 2. Form features (last 5 completed league matches)
    home_form = _team_form(home_team_id, fixture_date, league_id)
    away_form = _team_form(away_team_id, fixture_date, league_id)

    # 3. Fatigue / rest features (all competitions)
    home_fat = _team_fatigue(home_team_id, fixture_date)
    away_fat = _team_fatigue(away_team_id, fixture_date)

    # 4. Discipline / style
    home_disc = _team_discipline(home_team_id, fixture_date, league_id)
    away_disc = _team_discipline(away_team_id, fixture_date, league_id)

    # 5. Head-to-head
    h2h = _h2h_features(home_team_id, away_team_id, fixture_date)

    # 6. Odds-derived
    odds = _odds_features(fixture_id)

    # ── Assemble feature vector ───────────────────────────────────────────────
    features: dict = {
        # ELO (3 features)
        "elo_home": elo_home,
        "elo_away": elo_away,
        "elo_diff": elo_diff,

        # Home form (5 features)
        "home_form_pts": home_form["form_pts"],
        "home_goal_diff_5": home_form["goal_diff_5"],
        "home_clean_sheet_rate": home_form["clean_sheet_rate"],
        "home_btts_rate": home_form["btts_rate"],
        "home_over25_rate": home_form["over25_rate"],

        # Away form (5 features)
        "away_form_pts": away_form["form_pts"],
        "away_goal_diff_5": away_form["goal_diff_5"],
        "away_clean_sheet_rate": away_form["clean_sheet_rate"],
        "away_btts_rate": away_form["btts_rate"],
        "away_over25_rate": away_form["over25_rate"],

        # Fatigue / rest (4 features)
        "home_rest_days": home_fat["rest_days"],
        "away_rest_days": away_fat["rest_days"],
        "home_matches_last_30d": home_fat["matches_last_30d"],
        "away_matches_last_30d": away_fat["matches_last_30d"],

        # Discipline (4 features)
        "home_avg_cards_5": home_disc["avg_cards_5"],
        "away_avg_cards_5": away_disc["avg_cards_5"],
        "home_avg_corners_5": home_disc["avg_corners_5"],
        "away_avg_corners_5": away_disc["avg_corners_5"],

        # H2H (4 features)
        "h2h_home_wins": h2h["h2h_home_wins"],
        "h2h_draws": h2h["h2h_draws"],
        "h2h_away_wins": h2h["h2h_away_wins"],
        "h2h_avg_goals": h2h["h2h_avg_goals"],

        # Odds-derived (6 features)
        "odds_home": odds["odds_home"],
        "odds_draw": odds["odds_draw"],
        "odds_away": odds["odds_away"],
        "implied_prob_home": odds["implied_prob_home"],
        "implied_prob_draw": odds["implied_prob_draw"],
        "implied_prob_away": odds["implied_prob_away"],
    }

    logger.debug("Feature vector assembled: %d features", len(features))
    return features


# ── Feature list (for downstream use in predictor / trainer) ─────────────────

FEATURE_COLUMNS: list[str] = [
    "elo_home", "elo_away", "elo_diff",
    "home_form_pts", "home_goal_diff_5", "home_clean_sheet_rate",
    "home_btts_rate", "home_over25_rate",
    "away_form_pts", "away_goal_diff_5", "away_clean_sheet_rate",
    "away_btts_rate", "away_over25_rate",
    "home_rest_days", "away_rest_days",
    "home_matches_last_30d", "away_matches_last_30d",
    "home_avg_cards_5", "away_avg_cards_5",
    "home_avg_corners_5", "away_avg_corners_5",
    "h2h_home_wins", "h2h_draws", "h2h_away_wins", "h2h_avg_goals",
    "odds_home", "odds_draw", "odds_away",
    "implied_prob_home", "implied_prob_draw", "implied_prob_away",
]


# ── Empowerment Logic (US_030, US_031) ───────────────────────────────────────

def empower_league(league_id: int, force_rebuild: bool = False):
    """
    Surgically empowers a league by processing only new fixtures (Delta Logic).
    If force_rebuild is True, it clears the store for this league first.
    """
    if force_rebuild:
        logger.info(f"[League {league_id}] Force rebuild triggered. Clearing store...")
        delete_league_features(league_id)

    # 1. Fetch all completed fixtures for this league
    sql_all = """
        SELECT fixture_id, date, home_team_id, away_team_id, league_id
        FROM V3_Fixtures
        WHERE league_id = ?
          AND status_short IN ('FT', 'AET', 'PEN')
          AND goals_home IS NOT NULL
        ORDER BY date ASC
    """
    all_fixtures = fetch_all(sql_all, (league_id,))
    total_count = len(all_fixtures)
    
    # 2. Fetch already empowered IDs
    sql_cached = "SELECT fixture_id FROM V3_ML_Feature_Store WHERE league_id = ?"
    cached_ids = {row[0] for row in fetch_all(sql_cached, (league_id,))}
    
    # 3. Identify pending
    pending = [f for f in all_fixtures if f[0] not in cached_ids]
    skipped_count = total_count - len(pending)
    
    logger.info(f"[League {league_id}] Found {total_count} total matches. "
                f"{skipped_count} skipped (cached), {len(pending)} pending empowerment.")

    if not pending:
        logger.info(f"[League {league_id}] No pending matches. Already empowered.")
        return {"processed": 0, "skipped": skipped_count, "total": total_count}

    # 4. Process in batches
    batch_size = 100
    processed_count = 0
    
    for i in range(0, len(pending), batch_size):
        batch = pending[i:i+batch_size]
        batch_results = []
        
        for f in batch:
            f_id, f_date, h_id, a_id, l_id = f
            try:
                # build_features logic (anti-leakage is baked in)
                feats = build_features(f_id, str(f_date)[:10], h_id, a_id, l_id)
                batch_results.append({
                    "fixture_id": f_id,
                    "league_id": l_id,
                    "features": feats
                })
                processed_count += 1
                if processed_count % 10 == 0 or processed_count == len(pending):
                    # Progress log for the frontend observer
                    logger.info(f"[League {league_id}] [Progress] {processed_count}/{len(pending)} matches empowered")
            except Exception as e:
                logger.error(f"[League {league_id}] [Issue] Fixture {f_id} failed: {e}")

        # Save batch to DB
        if batch_results:
            save_feature_batch(batch_results)
            logger.info(f"[League {league_id}] [Success] Batch of {len(batch_results)} matches saved to store")

    return {"processed": processed_count, "skipped": skipped_count, "total": total_count}

