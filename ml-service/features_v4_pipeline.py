"""
features_v4_pipeline.py — Batch feature engineering pipeline for V4 models.

Architecture: bulk-load all data into memory, compute all features in-process.
No per-match DB queries → ~50x faster than naive approach.

Key differences vs features_v4.py:
- Rolling windows span ALL competitions (no competition_id filter)
- np.nan for absent stats (not 0.0) — CatBoost handles natively
- Fully vectorised batch: pandas groupby + sort, no per-match SQL

Usage:
    python features_v4_pipeline.py [options]

Options:
    --from-date YYYY-MM-DD  (default: 2015-01-01)
    --to-date   YYYY-MM-DD  (default: today)
    --comp-type league|cup  Filter by competition type (default: all)
    --min-history N         Min club appearances to include (default: 5)
    --feature-set-id TEXT   (default: v4_global_1x2_v1)
    --dry-run               Compute but don't store
    --batch-size N          Insert batch size (default: 500)
"""

import argparse
import json
import logging
from collections import defaultdict
from datetime import date
from typing import Optional

import numpy as np
import pandas as pd

from db_config import get_connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

FEATURE_SET_ID  = "v4_global_1x2_v2"
SCHEMA_VERSION  = "2.0"

# ---------------------------------------------------------------------------
# Feature columns — the schema the model will be trained on
# ---------------------------------------------------------------------------
V4_FEATURE_COLUMNS = [
    "mom_gd_h3", "mom_gd_h5", "mom_gd_h10", "mom_gd_h20",
    "mom_pts_h3", "mom_pts_h5", "mom_pts_h10", "mom_pts_h20",
    "win_rate_h5", "win_rate_h10",
    "cs_rate_h5", "cs_rate_h10",
    "goals_scored_avg_h5", "goals_conceded_avg_h5",
    "goals_scored_avg_h10", "goals_conceded_avg_h10",
    "home_form_gd5", "home_form_pts5", "home_form_win_rate5", "home_form_cs_rate5",
    "mom_gd_a3", "mom_gd_a5", "mom_gd_a10", "mom_gd_a20",
    "mom_pts_a3", "mom_pts_a5", "mom_pts_a10", "mom_pts_a20",
    "win_rate_a5", "win_rate_a10",
    "cs_rate_a5", "cs_rate_a10",
    "goals_scored_avg_a5", "goals_conceded_avg_a5",
    "goals_scored_avg_a10", "goals_conceded_avg_a10",
    "away_form_gd5", "away_form_pts5", "away_form_win_rate5", "away_form_cs_rate5",
    "diff_gd_l5", "diff_pts_l5", "diff_win_rate_l5",
    "diff_goals_scored_l5", "diff_goals_conceded_l5",
    "mom_xg_f_h5", "mom_xg_f_h10", "mom_xg_a_h5", "mom_xg_a_h10", "xg_eff_h5",
    "mom_xg_f_a5", "mom_xg_f_a10", "mom_xg_a_a5", "mom_xg_a_a10", "xg_eff_a5",
    "diff_xg_for_l5", "diff_xg_against_l5", "diff_xg_eff_l5",
    "home_season_rank", "away_season_rank", "diff_rank",
    "home_season_pts", "away_season_pts", "diff_pts",
    "home_season_gd", "away_season_gd", "diff_season_gd",
    "home_season_played", "away_season_played",
    "home_season_win_rate", "away_season_win_rate",
    "season_phase",
    "home_p_possession_avg_5", "away_p_possession_avg_5",
    "home_p_shots_per_match_5", "away_p_shots_per_match_5",
    "home_p_sot_per_match_5", "away_p_sot_per_match_5",
    "home_p_corners_per_match_5", "away_p_corners_per_match_5",
    "home_p_yellow_per_match_5", "away_p_yellow_per_match_5",
    "home_p_sot_rate_5", "away_p_sot_rate_5",
    "home_p_control_index_5", "away_p_control_index_5",
    "home_p_xg_per_shot_5", "away_p_xg_per_shot_5",
    "matchup_tempo_sum_5", "matchup_possession_gap_5",
    "matchup_corner_pressure_sum_5", "matchup_discipline_sum_5",
    "matchup_shot_quality_gap_5",
    "odds_home_prob", "odds_draw_prob", "odds_away_prob", "odds_margin",
    "is_cup", "is_league", "is_international_competition", "competition_type_code",
    "rest_h", "rest_a",
    # H2H
    "h2h_h_wins", "h2h_draws", "h2h_a_wins",
    "h2h_goals_h_avg", "h2h_goals_a_avg", "h2h_n",
    # Elo
    "elo_h", "elo_a", "elo_diff",
    # Player impact
    "home_squad_strength", "away_squad_strength", "squad_strength_diff",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def safe_div(a, b):
    with np.errstate(divide='ignore', invalid='ignore'):
        result = np.where(b != 0, a / b, np.nan)
    return result


def rolling_n(arr: np.ndarray, n: int) -> float:
    """Mean of last n non-NaN values from a sorted (most-recent-last) array."""
    valid = arr[~np.isnan(arr)][-n:]
    return float(valid.mean()) if len(valid) > 0 else np.nan


# ---------------------------------------------------------------------------
# Step 1: Bulk data loading
# ---------------------------------------------------------------------------

def load_all_matches(from_date: str, to_date: str, comp_type: Optional[str], conn) -> pd.DataFrame:
    """Load ALL completed matches in the date range into a DataFrame."""
    comp_filter = ""
    params = [from_date, to_date]
    if comp_type:
        comp_filter = "AND LOWER(c.competition_type) LIKE %s"
        params.append(f"%{comp_type.lower()}%")

    cur = conn.cursor()
    cur.execute(
        f"""
        SELECT
            m.match_id, m.match_date, m.home_club_id, m.away_club_id,
            m.home_score, m.away_score, m.xg_home, m.xg_away,
            m.competition_id, m.season_label,
            c.competition_type,
            ms.home_poss_ft, ms.away_poss_ft,
            ms.home_shots_ft, ms.away_shots_ft,
            ms.home_shots_ot_ft, ms.away_shots_ot_ft,
            ms.home_corners_ft, ms.away_corners_ft,
            ms.home_yellows_ft, ms.away_yellows_ft
        FROM v4.matches m
        LEFT JOIN v4.competitions c  ON c.competition_id  = m.competition_id
        LEFT JOIN v4.match_stats ms  ON ms.match_id       = m.match_id
        WHERE m.home_score IS NOT NULL
          AND m.match_date >= %s
          AND m.match_date <= %s
          {comp_filter}
        ORDER BY m.match_date ASC
        """,
        params,
    )
    rows = cur.fetchall()
    cur.close()

    cols = [
        "match_id", "match_date", "home_club_id", "away_club_id",
        "home_score", "away_score", "xg_home", "xg_away",
        "competition_id", "season_label", "competition_type",
        "home_poss_ft", "away_poss_ft",
        "home_shots_ft", "away_shots_ft",
        "home_shots_ot_ft", "away_shots_ot_ft",
        "home_corners_ft", "away_corners_ft",
        "home_yellows_ft", "away_yellows_ft",
    ]
    df = pd.DataFrame(rows, columns=cols)
    df["match_date"] = pd.to_datetime(df["match_date"])
    df.sort_values("match_date", inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


def load_all_history(conn) -> pd.DataFrame:
    """
    Load ALL completed matches (no date filter) — used for rolling window lookups.
    Only columns needed for rolling stats.
    """
    logger.info("Loading all historical matches for rolling windows…")
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            m.match_id, m.match_date, m.home_club_id, m.away_club_id,
            m.home_score, m.away_score, m.xg_home, m.xg_away,
            m.competition_id, m.season_label,
            ms.home_poss_ft, ms.away_poss_ft,
            ms.home_shots_ft, ms.away_shots_ft,
            ms.home_shots_ot_ft, ms.away_shots_ot_ft,
            ms.home_corners_ft, ms.away_corners_ft,
            ms.home_yellows_ft, ms.away_yellows_ft
        FROM v4.matches m
        LEFT JOIN v4.match_stats ms ON ms.match_id = m.match_id
        WHERE m.home_score IS NOT NULL
        ORDER BY m.match_date ASC
        """
    )
    rows = cur.fetchall()
    cur.close()

    cols = [
        "match_id", "match_date", "home_club_id", "away_club_id",
        "home_score", "away_score", "xg_home", "xg_away",
        "competition_id", "season_label",
        "home_poss_ft", "away_poss_ft",
        "home_shots_ft", "away_shots_ft",
        "home_shots_ot_ft", "away_shots_ot_ft",
        "home_corners_ft", "away_corners_ft",
        "home_yellows_ft", "away_yellows_ft",
    ]
    df = pd.DataFrame(rows, columns=cols)
    df["match_date"] = pd.to_datetime(df["match_date"])
    df.sort_values("match_date", inplace=True)
    df.reset_index(drop=True, inplace=True)
    logger.info(f"Loaded {len(df):,} historical matches")
    return df


def load_all_odds(conn) -> dict:
    """Load odds as {match_id: (odds_home, odds_draw, odds_away)}."""
    logger.info("Loading odds…")
    cur = conn.cursor()
    cur.execute(
        """
        SELECT DISTINCT ON (match_id) match_id, odds_home, odds_draw, odds_away
        FROM v4.match_odds
        WHERE odds_home IS NOT NULL AND odds_draw IS NOT NULL AND odds_away IS NOT NULL
          AND odds_home > 1 AND odds_draw > 1 AND odds_away > 1
        ORDER BY match_id, created_at DESC
        """
    )
    rows = cur.fetchall()
    cur.close()
    odds = {}
    for match_id, oh, od, oa in rows:
        odds[int(match_id)] = (float(oh), float(od), float(oa))
    logger.info(f"Loaded odds for {len(odds):,} matches")
    return odds


# ---------------------------------------------------------------------------
# Step 2: Pre-index history by club_id for fast lookup
# ---------------------------------------------------------------------------

def build_club_index(history: pd.DataFrame) -> dict[int, pd.DataFrame]:
    """
    Build a dict: club_id → sorted DataFrame of all their matches.
    Each row has perspective-aware columns (team_score, opp_score, etc).
    """
    logger.info("Building club index…")

    # Explode matches into two rows: one per club perspective
    home_rows = history.copy()
    home_rows["club_id"]     = home_rows["home_club_id"]
    home_rows["is_home"]     = True
    home_rows["team_score"]  = home_rows["home_score"].astype(float)
    home_rows["opp_score"]   = home_rows["away_score"].astype(float)
    home_rows["team_xg"]     = home_rows["xg_home"]
    home_rows["opp_xg"]      = home_rows["xg_away"]
    home_rows["team_poss"]   = home_rows["home_poss_ft"]
    home_rows["team_shots"]  = home_rows["home_shots_ft"]
    home_rows["team_sot"]    = home_rows["home_shots_ot_ft"]
    home_rows["team_corners"] = home_rows["home_corners_ft"]
    home_rows["team_yellows"] = home_rows["home_yellows_ft"]

    away_rows = history.copy()
    away_rows["club_id"]     = away_rows["away_club_id"]
    away_rows["is_home"]     = False
    away_rows["team_score"]  = away_rows["away_score"].astype(float)
    away_rows["opp_score"]   = away_rows["home_score"].astype(float)
    away_rows["team_xg"]     = away_rows["xg_away"]
    away_rows["opp_xg"]      = away_rows["xg_home"]
    away_rows["team_poss"]   = away_rows["away_poss_ft"]
    away_rows["team_shots"]  = away_rows["away_shots_ft"]
    away_rows["team_sot"]    = away_rows["away_shots_ot_ft"]
    away_rows["team_corners"] = away_rows["away_corners_ft"]
    away_rows["team_yellows"] = away_rows["away_yellows_ft"]

    stat_cols = [
        "club_id", "match_id", "match_date", "is_home",
        "team_score", "opp_score", "team_xg", "opp_xg",
        "team_poss", "team_shots", "team_sot", "team_corners", "team_yellows",
    ]
    combined = pd.concat([home_rows[stat_cols], away_rows[stat_cols]], ignore_index=True)
    combined["goal_diff"] = combined["team_score"] - combined["opp_score"]
    combined["points"]    = combined["goal_diff"].apply(lambda g: 3 if g > 0 else (1 if g == 0 else 0))
    combined["win"]       = (combined["goal_diff"] > 0).astype(float)
    combined["cs"]        = (combined["opp_score"] == 0).astype(float)

    combined.sort_values(["club_id", "match_date"], inplace=True)
    combined.reset_index(drop=True, inplace=True)

    club_idx: dict[int, pd.DataFrame] = {}
    for club_id, grp in combined.groupby("club_id", sort=False):
        club_idx[int(club_id)] = grp.reset_index(drop=True)

    logger.info(f"Club index built for {len(club_idx):,} clubs")
    return club_idx


# ---------------------------------------------------------------------------
# Step 3: Compute rolling stats for a single club at a point in time
# ---------------------------------------------------------------------------

def get_club_stats_at(club_id: int, before_date, club_idx: dict) -> dict:
    """
    Returns rolling stats for a club using all their matches before `before_date`.
    Reads from pre-built in-memory club index — no DB queries.
    """
    nan = np.nan
    empty = {
        "gd3": nan, "gd5": nan, "gd10": nan, "gd20": nan,
        "pts3": nan, "pts5": nan, "pts10": nan, "pts20": nan,
        "wr5": nan, "wr10": nan, "cs5": nan, "cs10": nan,
        "gf5": nan, "ga5": nan, "gf10": nan, "ga10": nan,
        "xgf5": nan, "xgf10": nan, "xga5": nan, "xga10": nan, "xg_eff5": nan,
        "poss5": nan, "shots5": nan, "sot5": nan, "corners5": nan, "yellows5": nan,
        "home_gd5": nan, "home_pts5": nan, "home_wr5": nan, "home_cs5": nan,
        "away_gd5": nan, "away_pts5": nan, "away_wr5": nan, "away_cs5": nan,
    }

    df = club_idx.get(int(club_id))
    if df is None:
        return empty

    mask = df["match_date"] < pd.Timestamp(before_date)
    hist = df[mask]
    if hist.empty:
        return empty

    gd  = hist["goal_diff"].values
    pts = hist["points"].values
    win = hist["win"].values
    cs  = hist["cs"].values
    gf  = hist["team_score"].values
    ga  = hist["opp_score"].values
    xgf = hist["team_xg"].values.astype(float)
    xga = hist["opp_xg"].values.astype(float)
    poss    = hist["team_poss"].values.astype(float)
    shots   = hist["team_shots"].values.astype(float)
    sot     = hist["team_sot"].values.astype(float)
    corners = hist["team_corners"].values.astype(float)
    yellows = hist["team_yellows"].values.astype(float)
    is_home = hist["is_home"].values

    def r(arr, n): return rolling_n(arr, n)

    stats = {
        "gd3":   r(gd,  3), "gd5":  r(gd,  5),
        "gd10":  r(gd, 10), "gd20": r(gd, 20),
        "pts3":  r(pts,  3), "pts5": r(pts,  5),
        "pts10": r(pts, 10), "pts20": r(pts, 20),
        "wr5":   r(win,  5), "wr10": r(win, 10),
        "cs5":   r(cs,   5), "cs10": r(cs,  10),
        "gf5":   r(gf,   5), "ga5":  r(ga,  5),
        "gf10":  r(gf,  10), "ga10": r(ga, 10),
        "xgf5":  r(xgf,  5), "xgf10": r(xgf, 10),
        "xga5":  r(xga,  5), "xga10": r(xga, 10),
        "poss5":    r(poss,    5),
        "shots5":   r(shots,   5),
        "sot5":     r(sot,     5),
        "corners5": r(corners, 5),
        "yellows5": r(yellows, 5),
    }

    # xG efficiency
    xgf5 = xgf[~np.isnan(xgf)][-5:]
    xga5 = xga[~np.isnan(xga)][-5:]
    n5 = min(len(xgf5), len(xga5))
    stats["xg_eff5"] = float((xgf5[-n5:] - xga5[-n5:]).mean()) if n5 > 0 else nan

    # Venue-specific form
    home_mask = is_home == True   # noqa: E712
    away_mask = is_home == False  # noqa: E712
    h_gd = gd[home_mask]; h_pts = pts[home_mask]
    h_win = win[home_mask]; h_cs = cs[home_mask]
    a_gd = gd[away_mask]; a_pts = pts[away_mask]
    a_win = win[away_mask]; a_cs = cs[away_mask]

    stats["home_gd5"]  = r(h_gd,  5); stats["home_pts5"] = r(h_pts, 5)
    stats["home_wr5"]  = r(h_win, 5); stats["home_cs5"]  = r(h_cs,  5)
    stats["away_gd5"]  = r(a_gd,  5); stats["away_pts5"] = r(a_pts, 5)
    stats["away_wr5"]  = r(a_win, 5); stats["away_cs5"]  = r(a_cs,  5)

    return stats


# ---------------------------------------------------------------------------
# Step 4: Season context (also in-memory)
# ---------------------------------------------------------------------------

def build_season_index(history: pd.DataFrame) -> dict:
    """
    Build: (club_id, competition_id, season_label) →
           sorted list of (match_date, is_home, gf, ga) for in-season standing calcs.
    """
    records = defaultdict(list)
    for _, row in history.iterrows():
        key_h = (int(row.home_club_id), row.competition_id, row.season_label)
        key_a = (int(row.away_club_id), row.competition_id, row.season_label)
        records[key_h].append((row.match_date, True,  int(row.home_score), int(row.away_score)))
        records[key_a].append((row.match_date, False, int(row.away_score), int(row.home_score)))
    # Sort each list by date
    for key in records:
        records[key].sort(key=lambda x: x[0])
    return dict(records)


def get_season_stats(club_id: int, competition_id, season_label: str,
                     before_date, season_idx: dict) -> dict:
    key = (int(club_id), competition_id, season_label)
    matches = season_idx.get(key, [])
    played = wins = draws = losses = gf = ga = pts = 0
    for mdate, is_home, f, a in matches:
        if mdate >= pd.Timestamp(before_date):
            break
        played += 1; gf += f; ga += a
        if f > a:   wins   += 1; pts += 3
        elif f == a: draws  += 1; pts += 1
        else:        losses += 1
    if played == 0:
        return {"played": 0, "pts": 0, "gd": 0, "win_rate": 0.0}
    return {
        "played":   played,
        "pts":      pts,
        "gd":       gf - ga,
        "win_rate": wins / played,
    }


def build_matchday_index(history: pd.DataFrame) -> dict:
    """(competition_id, season_label) → total distinct matchdays count."""
    idx = {}
    for (comp, season), grp in history.groupby(["competition_id", "season_label"]):
        idx[(comp, season)] = grp["match_date"].nunique()
    return idx


# ---------------------------------------------------------------------------
# Step 5: Competition type encoding
# ---------------------------------------------------------------------------

COMPETITION_TYPE_MAP = {"league": 0, "cup": 1, "international": 2, "european": 3}

def encode_competition(competition_type: Optional[str]) -> dict:
    ct = (competition_type or "").lower()
    code = 0
    for k, v in COMPETITION_TYPE_MAP.items():
        if k in ct:
            code = v; break
    return {
        "is_league": int("league" in ct),
        "is_cup": int("cup" in ct),
        "is_international_competition": int("international" in ct or "european" in ct),
        "competition_type_code": float(code),
    }


# ---------------------------------------------------------------------------
# Step 6a: Elo rating index (chronological pass over all history)
# ---------------------------------------------------------------------------

ELO_K_NEW   = 40      # < 10 matches
ELO_K_EST   = 20      # >= 10 matches
ELO_HOME_ADV = 100.0
ELO_INIT    = 1500.0


def build_elo_index(history: pd.DataFrame) -> dict:
    """
    Single chronological pass. Returns {club_id: (dates_ns_array, elos_before_array)}.
    dates_ns_array is sorted ascending — use np.searchsorted for O(log n) lookup.
    """
    logger.info("Building Elo index…")
    elo: dict[int, float] = {}
    apps: dict[int, int] = {}
    raw: dict[int, list] = {}  # club_id -> [(date_ns, elo_before)]

    # history is already sorted chronologically
    for row in history.itertuples():
        hid = int(row.home_club_id)
        aid = int(row.away_club_id)
        elo_h = elo.get(hid, ELO_INIT)
        elo_a = elo.get(aid, ELO_INIT)
        ts_ns = row.match_date.value

        if hid not in raw: raw[hid] = []
        if aid not in raw: raw[aid] = []
        raw[hid].append((ts_ns, elo_h))
        raw[aid].append((ts_ns, elo_a))

        exp_h = 1.0 / (1.0 + 10 ** ((elo_a - (elo_h + ELO_HOME_ADV)) / 400.0))
        hs, as_ = int(row.home_score), int(row.away_score)
        actual_h = 1.0 if hs > as_ else (0.5 if hs == as_ else 0.0)

        k_h = ELO_K_NEW if apps.get(hid, 0) < 10 else ELO_K_EST
        k_a = ELO_K_NEW if apps.get(aid, 0) < 10 else ELO_K_EST
        elo[hid] = elo_h + k_h * (actual_h - exp_h)
        elo[aid] = elo_a + k_a * ((1 - actual_h) - (1 - exp_h))
        apps[hid] = apps.get(hid, 0) + 1
        apps[aid] = apps.get(aid, 0) + 1

    result = {}
    for cid, entries in raw.items():
        arr = np.array(entries)
        result[int(cid)] = (arr[:, 0].astype(np.int64), arr[:, 1].astype(np.float64))

    logger.info(f"Elo index built for {len(result):,} clubs")
    return result


def get_elo_at(club_id: int, before_date, elo_index: dict) -> float:
    entry = elo_index.get(int(club_id))
    if entry is None:
        return np.nan
    dates_ns, elos = entry
    ts_ns = np.int64(pd.Timestamp(before_date).value)
    idx = int(np.searchsorted(dates_ns, ts_ns, side="left"))
    return float(elos[idx - 1]) if idx > 0 else np.nan


# ---------------------------------------------------------------------------
# Step 6b: H2H index
# ---------------------------------------------------------------------------

def build_h2h_index(history: pd.DataFrame) -> dict:
    """
    Returns {(min_id, max_id): (dates_ns, home_ids, h_scores, a_scores)} — all np arrays.
    Canonical pair key; interpret from home_id perspective in get_h2h_stats.
    """
    logger.info("Building H2H index…")
    raw: dict = {}
    for row in history.itertuples():
        hid = int(row.home_club_id)
        aid = int(row.away_club_id)
        key = (min(hid, aid), max(hid, aid))
        if key not in raw:
            raw[key] = []
        raw[key].append((row.match_date.value, hid, int(row.home_score), int(row.away_score)))

    result = {}
    for key, matches in raw.items():
        arr = np.array(matches)
        result[key] = (
            arr[:, 0].astype(np.int64),
            arr[:, 1].astype(np.int64),
            arr[:, 2].astype(np.int64),
            arr[:, 3].astype(np.int64),
        )
    logger.info(f"H2H index built for {len(result):,} pairs")
    return result


def get_h2h_stats(home_id: int, away_id: int, before_date, h2h_index: dict, n: int = 10) -> dict:
    nan = np.nan
    empty = {"h2h_h_wins": nan, "h2h_draws": nan, "h2h_a_wins": nan,
             "h2h_goals_h_avg": nan, "h2h_goals_a_avg": nan, "h2h_n": 0.0}
    key = (min(home_id, away_id), max(home_id, away_id))
    entry = h2h_index.get(key)
    if entry is None:
        return empty
    dates, home_ids, h_scores, a_scores = entry
    ts_ns = np.int64(pd.Timestamp(before_date).value)
    idx = int(np.searchsorted(dates, ts_ns, side="left"))
    if idx == 0:
        return empty
    start = max(0, idx - n)
    hids_s = home_ids[start:idx]
    hs_s   = h_scores[start:idx]
    as_s   = a_scores[start:idx]
    # From home_id perspective
    hid_goals = np.where(hids_s == home_id, hs_s, as_s)
    aid_goals = np.where(hids_s == home_id, as_s, hs_s)
    diff = hid_goals - aid_goals
    n_m = len(diff)
    return {
        "h2h_h_wins":      float(np.sum(diff > 0)),
        "h2h_draws":       float(np.sum(diff == 0)),
        "h2h_a_wins":      float(np.sum(diff < 0)),
        "h2h_goals_h_avg": float(np.mean(hid_goals)),
        "h2h_goals_a_avg": float(np.mean(aid_goals)),
        "h2h_n":           float(n_m),
    }


# ---------------------------------------------------------------------------
# Step 6c: Rest days index
# ---------------------------------------------------------------------------

def build_last_match_index(history: pd.DataFrame) -> dict:
    """Returns {club_id: sorted np.int64 array of match_date nanoseconds}."""
    logger.info("Building rest-days index…")
    home = history[["home_club_id", "match_date"]].rename(columns={"home_club_id": "club_id"})
    away = history[["away_club_id", "match_date"]].rename(columns={"away_club_id": "club_id"})
    all_ = pd.concat([home, away], ignore_index=True)
    all_["ts_ns"] = all_["match_date"].apply(lambda x: x.value)
    all_.sort_values(["club_id", "ts_ns"], inplace=True)
    result = {}
    for cid, grp in all_.groupby("club_id", sort=False):
        result[int(cid)] = grp["ts_ns"].values.astype(np.int64)
    logger.info(f"Rest-days index built for {len(result):,} clubs")
    return result


def get_rest_days(club_id: int, match_date, last_match_idx: dict, cap: int = 30) -> float:
    dates = last_match_idx.get(int(club_id))
    if dates is None or len(dates) == 0:
        return np.nan
    ts_ns = np.int64(pd.Timestamp(match_date).value)
    idx = int(np.searchsorted(dates, ts_ns, side="left"))
    if idx == 0:
        return np.nan
    days = (float(ts_ns) - float(dates[idx - 1])) / (1e9 * 86400)
    return float(min(days, cap))


# ---------------------------------------------------------------------------
# Step 6d: Player impact scores
# ---------------------------------------------------------------------------

def load_player_impact_scores(conn) -> dict:
    """
    Returns {(player_id, club_id): impact_score}.
    impact_score = avg_pts_when_player_starts − club_overall_avg_pts.
    Minimum 10 starts per player-club pair.
    """
    logger.info("Loading player impact scores…")
    cur = conn.cursor()
    cur.execute("""
        WITH club_pts AS (
            SELECT match_id, home_club_id AS club_id,
                   CASE WHEN home_score > away_score THEN 3
                        WHEN home_score = away_score THEN 1 ELSE 0 END AS pts
            FROM v4.matches WHERE home_score IS NOT NULL
            UNION ALL
            SELECT match_id, away_club_id,
                   CASE WHEN away_score > home_score THEN 3
                        WHEN home_score = away_score THEN 1 ELSE 0 END
            FROM v4.matches WHERE home_score IS NOT NULL
        ),
        club_avg AS (
            SELECT club_id, AVG(pts) AS avg_pts
            FROM club_pts GROUP BY club_id HAVING COUNT(*) >= 10
        ),
        player_with AS (
            SELECT l.player_id, l.club_id, AVG(cp.pts) AS avg_pts_with
            FROM v4.match_lineups l
            JOIN club_pts cp ON cp.match_id = l.match_id AND cp.club_id = l.club_id
            WHERE l.is_starter = true
            GROUP BY l.player_id, l.club_id
            HAVING COUNT(*) >= 10
        )
        SELECT pw.player_id, pw.club_id,
               pw.avg_pts_with - ca.avg_pts AS impact_score
        FROM player_with pw
        JOIN club_avg ca USING (club_id)
    """)
    rows = cur.fetchall()
    cur.close()
    result = {(int(r[0]), int(r[1])): float(r[2]) for r in rows}
    logger.info(f"Player impact scores loaded: {len(result):,} player-club pairs")
    return result


def build_match_lineup_index(match_ids: list, conn) -> dict:
    """
    Returns {match_id: {club_id: [player_ids]}} starters only.
    """
    if not match_ids:
        return {}
    logger.info(f"Loading lineups for {len(match_ids):,} matches…")
    placeholders = ",".join(["%s"] * len(match_ids))
    cur = conn.cursor()
    cur.execute(
        f"SELECT match_id, club_id, player_id FROM v4.match_lineups "
        f"WHERE match_id IN ({placeholders}) AND is_starter = true",
        match_ids,
    )
    rows = cur.fetchall()
    cur.close()
    result: dict = {}
    for mid, cid, pid in rows:
        mid, cid, pid = int(mid), int(cid), int(pid)
        if mid not in result: result[mid] = {}
        if cid not in result[mid]: result[mid][cid] = []
        result[mid][cid].append(pid)
    logger.info(f"Lineups loaded for {len(result):,} matches")
    return result


def get_squad_strength(club_id: int, match_id: int,
                        lineup_idx: dict, impact_idx: dict) -> float:
    players = lineup_idx.get(int(match_id), {}).get(int(club_id))
    if not players:
        return np.nan
    scores = [impact_idx.get((pid, int(club_id)), np.nan) for pid in players]
    valid  = [s for s in scores if not np.isnan(s)]
    return float(np.mean(valid)) if valid else np.nan


# ---------------------------------------------------------------------------
# Step 6: Build one feature vector
# ---------------------------------------------------------------------------

def build_feature_vector(row: pd.Series,
                          club_idx: dict,
                          season_idx: dict,
                          matchday_idx: dict,
                          odds_map: dict,
                          elo_idx: Optional[dict] = None,
                          h2h_idx: Optional[dict] = None,
                          last_match_idx: Optional[dict] = None,
                          lineup_idx: Optional[dict] = None,
                          impact_idx: Optional[dict] = None) -> dict:
    nan = np.nan
    home_id = int(row.home_club_id)
    away_id = int(row.away_club_id)
    match_date = row.match_date
    competition_id = row.competition_id
    season_label = row.season_label

    h = get_club_stats_at(home_id, match_date, club_idx)
    a = get_club_stats_at(away_id, match_date, club_idx)

    def diff(hk, ak):
        hv, av = h.get(hk, nan), a.get(ak, nan)
        return (hv - av) if not (np.isnan(hv) or np.isnan(av)) else nan

    # Season context
    hs = get_season_stats(home_id, competition_id, season_label, match_date, season_idx)
    as_ = get_season_stats(away_id, competition_id, season_label, match_date, season_idx)
    total_md = matchday_idx.get((competition_id, season_label), 30)
    season_phase = min(1.0, hs["played"] / max(total_md, 1))

    # Odds
    match_id = int(row.match_id)
    odds_feats = {"odds_home_prob": nan, "odds_draw_prob": nan, "odds_away_prob": nan, "odds_margin": nan}
    if match_id in odds_map:
        oh, od, oa = odds_map[match_id]
        ip_h, ip_d, ip_a = 1/oh, 1/od, 1/oa
        margin = ip_h + ip_d + ip_a - 1
        if margin > 0:
            odds_feats = {
                "odds_home_prob": round(ip_h / (1 + margin), 6),
                "odds_draw_prob": round(ip_d / (1 + margin), 6),
                "odds_away_prob": round(ip_a / (1 + margin), 6),
                "odds_margin":    round(margin, 6),
            }

    comp_feats = encode_competition(row.competition_type if hasattr(row, "competition_type") else None)

    # Elo
    elo_feats = {"elo_h": nan, "elo_a": nan, "elo_diff": nan}
    if elo_idx is not None:
        eh = get_elo_at(home_id, match_date, elo_idx)
        ea = get_elo_at(away_id, match_date, elo_idx)
        elo_feats = {
            "elo_h":    eh,
            "elo_a":    ea,
            "elo_diff": (eh - ea) if not (np.isnan(eh) or np.isnan(ea)) else nan,
        }

    # H2H
    h2h_feats = {"h2h_h_wins": nan, "h2h_draws": nan, "h2h_a_wins": nan,
                 "h2h_goals_h_avg": nan, "h2h_goals_a_avg": nan, "h2h_n": 0.0}
    if h2h_idx is not None:
        h2h_feats = get_h2h_stats(home_id, away_id, match_date, h2h_idx)

    # Rest days (real value, replaces hardcoded 7.0)
    rest_h = get_rest_days(home_id, match_date, last_match_idx) if last_match_idx is not None else nan
    rest_a = get_rest_days(away_id, match_date, last_match_idx) if last_match_idx is not None else nan

    # Squad strength
    squad_feats = {"home_squad_strength": nan, "away_squad_strength": nan, "squad_strength_diff": nan}
    if lineup_idx is not None and impact_idx is not None:
        ss_h = get_squad_strength(home_id, match_id, lineup_idx, impact_idx)
        ss_a = get_squad_strength(away_id, match_id, lineup_idx, impact_idx)
        squad_feats = {
            "home_squad_strength": ss_h,
            "away_squad_strength": ss_a,
            "squad_strength_diff": (ss_h - ss_a) if not (np.isnan(ss_h) or np.isnan(ss_a)) else nan,
        }

    # Performance diffs
    h_shots5   = h["shots5"];   a_shots5   = a["shots5"]
    h_sot5     = h["sot5"];     a_sot5     = a["sot5"]
    h_corners5 = h["corners5"]; a_corners5 = a["corners5"]
    h_poss5    = h["poss5"];    a_poss5    = a["poss5"]
    h_yellow5  = h["yellows5"]; a_yellow5  = a["yellows5"]
    h_xgf5     = h["xgf5"];     a_xgf5     = a["xgf5"]

    def safe_div_v(a_v, b_v):
        if np.isnan(a_v) or np.isnan(b_v) or b_v == 0:
            return nan
        return a_v / b_v

    def nansum(x, y):
        if np.isnan(x) and np.isnan(y): return nan
        return (0 if np.isnan(x) else x) + (0 if np.isnan(y) else y)

    def nanabs_diff(x, y):
        if np.isnan(x) or np.isnan(y): return nan
        return abs(x - y)

    return {
        # Home momentum
        "mom_gd_h3":  h["gd3"],  "mom_gd_h5":  h["gd5"],
        "mom_gd_h10": h["gd10"], "mom_gd_h20": h["gd20"],
        "mom_pts_h3":  h["pts3"],  "mom_pts_h5":  h["pts5"],
        "mom_pts_h10": h["pts10"], "mom_pts_h20": h["pts20"],
        "win_rate_h5": h["wr5"], "win_rate_h10": h["wr10"],
        "cs_rate_h5":  h["cs5"],  "cs_rate_h10": h["cs10"],
        "goals_scored_avg_h5":   h["gf5"],  "goals_conceded_avg_h5":  h["ga5"],
        "goals_scored_avg_h10":  h["gf10"], "goals_conceded_avg_h10": h["ga10"],
        "home_form_gd5":      h["home_gd5"],  "home_form_pts5":     h["home_pts5"],
        "home_form_win_rate5": h["home_wr5"], "home_form_cs_rate5": h["home_cs5"],
        # Away momentum
        "mom_gd_a3":  a["gd3"],  "mom_gd_a5":  a["gd5"],
        "mom_gd_a10": a["gd10"], "mom_gd_a20": a["gd20"],
        "mom_pts_a3":  a["pts3"],  "mom_pts_a5":  a["pts5"],
        "mom_pts_a10": a["pts10"], "mom_pts_a20": a["pts20"],
        "win_rate_a5": a["wr5"], "win_rate_a10": a["wr10"],
        "cs_rate_a5":  a["cs5"],  "cs_rate_a10": a["cs10"],
        "goals_scored_avg_a5":   a["gf5"],  "goals_conceded_avg_a5":  a["ga5"],
        "goals_scored_avg_a10":  a["gf10"], "goals_conceded_avg_a10": a["ga10"],
        "away_form_gd5":      a["away_gd5"],  "away_form_pts5":     a["away_pts5"],
        "away_form_win_rate5": a["away_wr5"], "away_form_cs_rate5": a["away_cs5"],
        # Diffs
        "diff_gd_l5":             diff("gd5",  "gd5"),
        "diff_pts_l5":            diff("pts5", "pts5"),
        "diff_win_rate_l5":       diff("wr5",  "wr5"),
        "diff_goals_scored_l5":   diff("gf5",  "gf5"),
        "diff_goals_conceded_l5": diff("ga5",  "ga5"),
        # xG
        "mom_xg_f_h5":  h["xgf5"],  "mom_xg_f_h10": h["xgf10"],
        "mom_xg_a_h5":  h["xga5"],  "mom_xg_a_h10": h["xga10"],
        "xg_eff_h5":    h["xg_eff5"],
        "mom_xg_f_a5":  a["xgf5"],  "mom_xg_f_a10": a["xgf10"],
        "mom_xg_a_a5":  a["xga5"],  "mom_xg_a_a10": a["xga10"],
        "xg_eff_a5":    a["xg_eff5"],
        "diff_xg_for_l5":     diff("xgf5",    "xgf5"),
        "diff_xg_against_l5": diff("xga5",    "xga5"),
        "diff_xg_eff_l5":     diff("xg_eff5", "xg_eff5"),
        # Season
        "home_season_rank": nan, "away_season_rank": nan, "diff_rank": nan,
        "home_season_pts":  float(hs["pts"]),  "away_season_pts":  float(as_["pts"]),
        "diff_pts":         float(hs["pts"]) - float(as_["pts"]),
        "home_season_gd":   float(hs["gd"]),   "away_season_gd":   float(as_["gd"]),
        "diff_season_gd":   float(hs["gd"]) - float(as_["gd"]),
        "home_season_played": float(hs["played"]), "away_season_played": float(as_["played"]),
        "home_season_win_rate": float(hs["win_rate"]), "away_season_win_rate": float(as_["win_rate"]),
        "season_phase": season_phase,
        # Performance
        "home_p_possession_avg_5": h_poss5,   "away_p_possession_avg_5": a_poss5,
        "home_p_shots_per_match_5": h_shots5, "away_p_shots_per_match_5": a_shots5,
        "home_p_sot_per_match_5":   h_sot5,   "away_p_sot_per_match_5":   a_sot5,
        "home_p_corners_per_match_5": h_corners5, "away_p_corners_per_match_5": a_corners5,
        "home_p_yellow_per_match_5":  h_yellow5,  "away_p_yellow_per_match_5":  a_yellow5,
        "home_p_sot_rate_5": safe_div_v(h_sot5, h_shots5),
        "away_p_sot_rate_5": safe_div_v(a_sot5, a_shots5),
        "home_p_control_index_5": safe_div_v(h_poss5 * h_sot5, 100.0) if not (np.isnan(h_poss5) or np.isnan(h_sot5)) else nan,
        "away_p_control_index_5": safe_div_v(a_poss5 * a_sot5, 100.0) if not (np.isnan(a_poss5) or np.isnan(a_sot5)) else nan,
        "home_p_xg_per_shot_5": safe_div_v(h_xgf5, h_shots5),
        "away_p_xg_per_shot_5": safe_div_v(a_xgf5, a_shots5),
        # Matchups
        "matchup_tempo_sum_5":        nansum(h_shots5, a_shots5),
        "matchup_possession_gap_5":   nanabs_diff(h_poss5, a_poss5),
        "matchup_corner_pressure_sum_5": nansum(h_corners5, a_corners5),
        "matchup_discipline_sum_5":   nansum(h_yellow5, a_yellow5),
        "matchup_shot_quality_gap_5": nanabs_diff(safe_div_v(h_xgf5, h_shots5), safe_div_v(a_xgf5, a_shots5)),
        # Odds
        **odds_feats,
        # Competition
        **comp_feats,
        # Rest
        "rest_h": rest_h, "rest_a": rest_a,
        # H2H
        **h2h_feats,
        # Elo
        **elo_feats,
        # Squad strength
        **squad_feats,
    }


# ---------------------------------------------------------------------------
# Step 7: Batch storage
# ---------------------------------------------------------------------------

def store_batch(records: list[tuple], conn) -> None:
    """Bulk upsert (match_id, feature_set_id, feature_vector_json)."""
    if not records:
        return
    cur = conn.cursor()
    cur.executemany(
        """
        INSERT INTO v4.ml_feature_store
            (match_id, feature_set_id, schema_version, feature_vector, computed_at)
        VALUES (%s, %s, %s, %s::jsonb, NOW())
        ON CONFLICT (match_id, feature_set_id) DO UPDATE
            SET feature_vector = EXCLUDED.feature_vector,
                computed_at    = NOW(),
                schema_version = EXCLUDED.schema_version
        """,
        records,
    )
    conn.commit()
    cur.close()


# ---------------------------------------------------------------------------
# Serialization
# ---------------------------------------------------------------------------

def vector_to_json(vector: dict) -> str:
    def _c(v):
        if isinstance(v, float) and np.isnan(v): return None
        if isinstance(v, (np.integer,)): return int(v)
        if isinstance(v, (np.floating,)): return float(v)
        return v
    return json.dumps({k: _c(v) for k, v in vector.items()})


def vector_from_json(json_str: str) -> dict:
    raw = json.loads(json_str) if isinstance(json_str, str) else json_str
    return {k: (np.nan if v is None else float(v)) for k, v in raw.items()}


# ---------------------------------------------------------------------------
# On-the-fly inference (used by predictor_v4.py)
# ---------------------------------------------------------------------------

def compute_feature_vector_v4(match_id: int, conn=None) -> dict:
    """
    On-the-fly feature computation for a single match (inference time).
    No pre-built indexes — does individual DB queries (acceptable for single match).
    """
    close_conn = conn is None
    if conn is None:
        conn = get_connection()

    try:
        # Load match context
        cur = conn.cursor()
        cur.execute(
            """
            SELECT m.match_id, m.match_date, m.home_club_id, m.away_club_id,
                   m.competition_id, m.season_label,
                   c.competition_type
            FROM v4.matches m
            LEFT JOIN v4.competitions c ON c.competition_id = m.competition_id
            WHERE m.match_id = %s
            """,
            (match_id,),
        )
        row = cur.fetchone()
        cur.close()
        if not row:
            raise ValueError(f"V4 match {match_id} not found.")

        mid, match_date, home_id, away_id, competition_id, season_label, competition_type = row

        # Build small history DataFrames per club (last 30 matches, all competitions)
        def load_club_hist(club_id):
            c = conn.cursor()
            c.execute(
                """
                SELECT m.match_date,
                       CASE WHEN m.home_club_id=%s THEN 1 ELSE 0 END AS is_home,
                       CASE WHEN m.home_club_id=%s THEN m.home_score ELSE m.away_score END AS ts,
                       CASE WHEN m.home_club_id=%s THEN m.away_score ELSE m.home_score END AS os,
                       CASE WHEN m.home_club_id=%s THEN m.xg_home ELSE m.xg_away END AS txg,
                       CASE WHEN m.home_club_id=%s THEN m.xg_away ELSE m.xg_home END AS oxg,
                       CASE WHEN m.home_club_id=%s THEN ms.home_poss_ft ELSE ms.away_poss_ft END AS poss,
                       CASE WHEN m.home_club_id=%s THEN ms.home_shots_ft ELSE ms.away_shots_ft END AS shots,
                       CASE WHEN m.home_club_id=%s THEN ms.home_shots_ot_ft ELSE ms.away_shots_ot_ft END AS sot,
                       CASE WHEN m.home_club_id=%s THEN ms.home_corners_ft ELSE ms.away_corners_ft END AS corners,
                       CASE WHEN m.home_club_id=%s THEN ms.home_yellows_ft ELSE ms.away_yellows_ft END AS yellows
                FROM v4.matches m
                LEFT JOIN v4.match_stats ms ON ms.match_id = m.match_id
                WHERE (m.home_club_id=%s OR m.away_club_id=%s)
                  AND m.home_score IS NOT NULL AND m.match_date < %s
                ORDER BY m.match_date DESC LIMIT 30
                """,
                (club_id,) * 10 + (club_id, club_id, match_date),
            )
            rows = c.fetchall()
            c.close()
            cols = ["match_date","is_home","team_score","opp_score","team_xg","opp_xg",
                    "team_poss","team_shots","team_sot","team_corners","team_yellows"]
            df = pd.DataFrame(rows, columns=cols)
            if df.empty: return df
            df["goal_diff"] = df["team_score"].astype(float) - df["opp_score"].astype(float)
            df["points"] = df["goal_diff"].apply(lambda g: 3 if g>0 else (1 if g==0 else 0))
            df["win"] = (df["goal_diff"] > 0).astype(float)
            df["cs"]  = (df["opp_score"] == 0).astype(float)
            # sort oldest-first for rolling_n (which takes last N)
            return df.iloc[::-1].reset_index(drop=True)

        home_hist = load_club_hist(home_id)
        away_hist = load_club_hist(away_id)

        def mk_stats(df):
            if df.empty: return {k: np.nan for k in ["gd3","gd5","gd10","gd20","pts3","pts5","pts10","pts20",
                "wr5","wr10","cs5","cs10","gf5","ga5","gf10","ga10","xgf5","xgf10","xga5","xga10","xg_eff5",
                "poss5","shots5","sot5","corners5","yellows5",
                "home_gd5","home_pts5","home_wr5","home_cs5","away_gd5","away_pts5","away_wr5","away_cs5"]}
            gd=df["goal_diff"].values; pts=df["points"].values; win=df["win"].values; cs=df["cs"].values
            gf=df["team_score"].astype(float).values; ga=df["opp_score"].astype(float).values
            xgf=df["team_xg"].astype(float).values; xga=df["opp_xg"].astype(float).values
            poss=df["team_poss"].astype(float).values; shots=df["team_shots"].astype(float).values
            sot=df["team_sot"].astype(float).values; corners=df["team_corners"].astype(float).values
            yellows=df["team_yellows"].astype(float).values
            is_home=df["is_home"].values
            r = rolling_n
            xgf5=xgf[~np.isnan(xgf)][-5:]; xga5=xga[~np.isnan(xga)][-5:]
            n5=min(len(xgf5),len(xga5))
            h_mask=is_home==1; a_mask=is_home==0
            return {
                "gd3":r(gd,3),"gd5":r(gd,5),"gd10":r(gd,10),"gd20":r(gd,20),
                "pts3":r(pts,3),"pts5":r(pts,5),"pts10":r(pts,10),"pts20":r(pts,20),
                "wr5":r(win,5),"wr10":r(win,10),"cs5":r(cs,5),"cs10":r(cs,10),
                "gf5":r(gf,5),"ga5":r(ga,5),"gf10":r(gf,10),"ga10":r(ga,10),
                "xgf5":r(xgf,5),"xgf10":r(xgf,10),"xga5":r(xga,5),"xga10":r(xga,10),
                "xg_eff5":float((xgf5[-n5:]-xga5[-n5:]).mean()) if n5>0 else np.nan,
                "poss5":r(poss,5),"shots5":r(shots,5),"sot5":r(sot,5),
                "corners5":r(corners,5),"yellows5":r(yellows,5),
                "home_gd5":r(gd[h_mask],5),"home_pts5":r(pts[h_mask],5),
                "home_wr5":r(win[h_mask],5),"home_cs5":r(cs[h_mask],5),
                "away_gd5":r(gd[a_mask],5),"away_pts5":r(pts[a_mask],5),
                "away_wr5":r(win[a_mask],5),"away_cs5":r(cs[a_mask],5),
            }

        h = mk_stats(home_hist)
        a = mk_stats(away_hist)

        # Odds
        odds_feats = {"odds_home_prob":np.nan,"odds_draw_prob":np.nan,"odds_away_prob":np.nan,"odds_margin":np.nan}
        try:
            cur = conn.cursor()
            cur.execute("SELECT odds_home,odds_draw,odds_away FROM v4.match_odds WHERE match_id=%s AND odds_home IS NOT NULL ORDER BY created_at DESC LIMIT 1",(match_id,))
            or_ = cur.fetchone(); cur.close()
            if or_ and all(v and float(v)>1 for v in or_):
                oh,od,oa=float(or_[0]),float(or_[1]),float(or_[2])
                ip_h,ip_d,ip_a=1/oh,1/od,1/oa; mg=ip_h+ip_d+ip_a-1
                if mg>0: odds_feats={"odds_home_prob":round(ip_h/(1+mg),6),"odds_draw_prob":round(ip_d/(1+mg),6),"odds_away_prob":round(ip_a/(1+mg),6),"odds_margin":round(mg,6)}
        except Exception: conn.rollback()

        comp_feats = encode_competition(competition_type)
        nan = np.nan

        def diff(hk,ak):
            hv,av=h.get(hk,nan),a.get(ak,nan)
            return (hv-av) if not(np.isnan(hv) or np.isnan(av)) else nan

        def sdv(x,y):
            return (x/y) if not(np.isnan(x) or np.isnan(y) or y==0) else nan

        h_shots5=h["shots5"];a_shots5=a["shots5"];h_sot5=h["sot5"];a_sot5=a["sot5"]
        h_corners5=h["corners5"];a_corners5=a["corners5"];h_poss5=h["poss5"];a_poss5=a["poss5"]
        h_yellow5=h["yellows5"];a_yellow5=a["yellows5"];h_xgf5=h["xgf5"];a_xgf5=a["xgf5"]

        def ns(x,y): return (0 if np.isnan(x) else x)+(0 if np.isnan(y) else y) if not(np.isnan(x) and np.isnan(y)) else nan
        def nad(x,y): return abs(x-y) if not(np.isnan(x) or np.isnan(y)) else nan

        # --- Rest days (from last match before this date) ---
        def _rest_days(club_id):
            try:
                c = conn.cursor()
                c.execute(
                    """SELECT match_date FROM v4.matches
                       WHERE (home_club_id=%s OR away_club_id=%s)
                         AND home_score IS NOT NULL AND match_date < %s
                       ORDER BY match_date DESC LIMIT 1""",
                    (club_id, club_id, match_date),
                )
                r = c.fetchone(); c.close()
                if r:
                    days = (pd.Timestamp(match_date) - pd.Timestamp(r[0])).days
                    return float(min(days, 30))
            except Exception: conn.rollback()
            return nan

        rest_h = _rest_days(home_id)
        rest_a = _rest_days(away_id)

        # --- Elo (simple per-club query on recent Elo-sorted history) ---
        def _elo(club_id):
            """Quick Elo estimate: iterate chronological matches before this date."""
            try:
                c = conn.cursor()
                c.execute(
                    """SELECT home_club_id, away_club_id, home_score, away_score
                       FROM v4.matches
                       WHERE (home_club_id=%s OR away_club_id=%s)
                         AND home_score IS NOT NULL AND match_date < %s
                       ORDER BY match_date ASC""",
                    (club_id, club_id, match_date),
                )
                rows = c.fetchall(); c.close()
                elo = ELO_INIT; apps = 0
                for hid, aid, hs, as_ in rows:
                    hid, aid = int(hid), int(aid)
                    elo_opp = ELO_INIT  # simplified: no opp tracking here
                    exp = 1.0 / (1.0 + 10 ** ((elo_opp - (elo + ELO_HOME_ADV if hid==club_id else elo)) / 400.0))
                    actual = 1.0 if (hs>as_ and hid==club_id) or (as_>hs and aid==club_id) else (0.5 if hs==as_ else 0.0)
                    k = ELO_K_NEW if apps < 10 else ELO_K_EST
                    elo += k * (actual - exp); apps += 1
                return float(elo)
            except Exception: conn.rollback()
            return nan

        elo_h_v = _elo(home_id)
        elo_a_v = _elo(away_id)
        elo_diff_v = (elo_h_v - elo_a_v) if not (np.isnan(elo_h_v) or np.isnan(elo_a_v)) else nan

        # --- H2H (last 10 direct meetings before this date) ---
        h2h_feats = {"h2h_h_wins":nan,"h2h_draws":nan,"h2h_a_wins":nan,
                     "h2h_goals_h_avg":nan,"h2h_goals_a_avg":nan,"h2h_n":0.0}
        try:
            c = conn.cursor()
            c.execute(
                """SELECT home_club_id, home_score, away_score
                   FROM v4.matches
                   WHERE ((home_club_id=%s AND away_club_id=%s) OR (home_club_id=%s AND away_club_id=%s))
                     AND home_score IS NOT NULL AND match_date < %s
                   ORDER BY match_date DESC LIMIT 10""",
                (home_id, away_id, away_id, home_id, match_date),
            )
            h2h_rows = c.fetchall(); c.close()
            if h2h_rows:
                h_w=d=a_w=0; hg_sum=ag_sum=0
                for hid, hs, as_ in h2h_rows:
                    hg = hs if int(hid)==home_id else as_
                    ag = as_ if int(hid)==home_id else hs
                    hg_sum+=hg; ag_sum+=ag
                    if hg>ag: h_w+=1
                    elif hg==ag: d+=1
                    else: a_w+=1
                n = len(h2h_rows)
                h2h_feats = {"h2h_h_wins":float(h_w),"h2h_draws":float(d),"h2h_a_wins":float(a_w),
                             "h2h_goals_h_avg":hg_sum/n,"h2h_goals_a_avg":ag_sum/n,"h2h_n":float(n)}
        except Exception: conn.rollback()

        # --- Squad strength (mean impact of last-known lineup) ---
        squad_feats = {"home_squad_strength":nan,"away_squad_strength":nan,"squad_strength_diff":nan}
        try:
            impact_idx = load_player_impact_scores(conn)
            def _squad_strength(club_id):
                c = conn.cursor()
                # Use last 5 actual lineups to estimate typical squad strength
                c.execute(
                    """SELECT l.player_id FROM v4.match_lineups l
                       JOIN v4.matches m ON m.match_id = l.match_id
                       WHERE l.club_id=%s AND l.is_starter=true
                         AND m.home_score IS NOT NULL AND m.match_date < %s
                       ORDER BY m.match_date DESC LIMIT 55""",
                    (club_id, match_date),
                )
                rows = c.fetchall(); c.close()
                scores = [impact_idx.get((int(r[0]), int(club_id)), nan) for r in rows]
                valid = [s for s in scores if not np.isnan(s)]
                return float(np.mean(valid)) if valid else nan
            ss_h = _squad_strength(home_id)
            ss_a = _squad_strength(away_id)
            squad_feats = {
                "home_squad_strength": ss_h,
                "away_squad_strength": ss_a,
                "squad_strength_diff": (ss_h-ss_a) if not(np.isnan(ss_h) or np.isnan(ss_a)) else nan,
            }
        except Exception: conn.rollback()

        vector = {
            "mom_gd_h3":h["gd3"],"mom_gd_h5":h["gd5"],"mom_gd_h10":h["gd10"],"mom_gd_h20":h["gd20"],
            "mom_pts_h3":h["pts3"],"mom_pts_h5":h["pts5"],"mom_pts_h10":h["pts10"],"mom_pts_h20":h["pts20"],
            "win_rate_h5":h["wr5"],"win_rate_h10":h["wr10"],"cs_rate_h5":h["cs5"],"cs_rate_h10":h["cs10"],
            "goals_scored_avg_h5":h["gf5"],"goals_conceded_avg_h5":h["ga5"],"goals_scored_avg_h10":h["gf10"],"goals_conceded_avg_h10":h["ga10"],
            "home_form_gd5":h["home_gd5"],"home_form_pts5":h["home_pts5"],"home_form_win_rate5":h["home_wr5"],"home_form_cs_rate5":h["home_cs5"],
            "mom_gd_a3":a["gd3"],"mom_gd_a5":a["gd5"],"mom_gd_a10":a["gd10"],"mom_gd_a20":a["gd20"],
            "mom_pts_a3":a["pts3"],"mom_pts_a5":a["pts5"],"mom_pts_a10":a["pts10"],"mom_pts_a20":a["pts20"],
            "win_rate_a5":a["wr5"],"win_rate_a10":a["wr10"],"cs_rate_a5":a["cs5"],"cs_rate_a10":a["cs10"],
            "goals_scored_avg_a5":a["gf5"],"goals_conceded_avg_a5":a["ga5"],"goals_scored_avg_a10":a["gf10"],"goals_conceded_avg_a10":a["ga10"],
            "away_form_gd5":a["away_gd5"],"away_form_pts5":a["away_pts5"],"away_form_win_rate5":a["away_wr5"],"away_form_cs_rate5":a["away_cs5"],
            "diff_gd_l5":diff("gd5","gd5"),"diff_pts_l5":diff("pts5","pts5"),"diff_win_rate_l5":diff("wr5","wr5"),
            "diff_goals_scored_l5":diff("gf5","gf5"),"diff_goals_conceded_l5":diff("ga5","ga5"),
            "mom_xg_f_h5":h["xgf5"],"mom_xg_f_h10":h["xgf10"],"mom_xg_a_h5":h["xga5"],"mom_xg_a_h10":h["xga10"],"xg_eff_h5":h["xg_eff5"],
            "mom_xg_f_a5":a["xgf5"],"mom_xg_f_a10":a["xgf10"],"mom_xg_a_a5":a["xga5"],"mom_xg_a_a10":a["xga10"],"xg_eff_a5":a["xg_eff5"],
            "diff_xg_for_l5":diff("xgf5","xgf5"),"diff_xg_against_l5":diff("xga5","xga5"),"diff_xg_eff_l5":diff("xg_eff5","xg_eff5"),
            "home_season_rank":nan,"away_season_rank":nan,"diff_rank":nan,
            "home_season_pts":0.0,"away_season_pts":0.0,"diff_pts":0.0,
            "home_season_gd":0.0,"away_season_gd":0.0,"diff_season_gd":0.0,
            "home_season_played":0.0,"away_season_played":0.0,
            "home_season_win_rate":0.0,"away_season_win_rate":0.0,"season_phase":0.5,
            "home_p_possession_avg_5":h_poss5,"away_p_possession_avg_5":a_poss5,
            "home_p_shots_per_match_5":h_shots5,"away_p_shots_per_match_5":a_shots5,
            "home_p_sot_per_match_5":h_sot5,"away_p_sot_per_match_5":a_sot5,
            "home_p_corners_per_match_5":h_corners5,"away_p_corners_per_match_5":a_corners5,
            "home_p_yellow_per_match_5":h_yellow5,"away_p_yellow_per_match_5":a_yellow5,
            "home_p_sot_rate_5":sdv(h_sot5,h_shots5),"away_p_sot_rate_5":sdv(a_sot5,a_shots5),
            "home_p_control_index_5":sdv(h_poss5*h_sot5,100.0) if not(np.isnan(h_poss5) or np.isnan(h_sot5)) else nan,
            "away_p_control_index_5":sdv(a_poss5*a_sot5,100.0) if not(np.isnan(a_poss5) or np.isnan(a_sot5)) else nan,
            "home_p_xg_per_shot_5":sdv(h_xgf5,h_shots5),"away_p_xg_per_shot_5":sdv(a_xgf5,a_shots5),
            "matchup_tempo_sum_5":ns(h_shots5,a_shots5),"matchup_possession_gap_5":nad(h_poss5,a_poss5),
            "matchup_corner_pressure_sum_5":ns(h_corners5,a_corners5),"matchup_discipline_sum_5":ns(h_yellow5,a_yellow5),
            "matchup_shot_quality_gap_5":nad(sdv(h_xgf5,h_shots5),sdv(a_xgf5,a_shots5)),
            **odds_feats,**comp_feats,
            "rest_h":rest_h,"rest_a":rest_a,
            **h2h_feats,
            "elo_h":elo_h_v,"elo_a":elo_a_v,"elo_diff":elo_diff_v,
            **squad_feats,
        }
        return {col: vector.get(col, nan) for col in V4_FEATURE_COLUMNS}

    finally:
        if close_conn:
            conn.close()


def store_feature_vector(match_id: int, vector: dict, conn, feature_set_id: str = FEATURE_SET_ID) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO v4.ml_feature_store (match_id, feature_set_id, schema_version, feature_vector, computed_at)
        VALUES (%s, %s, %s, %s::jsonb, NOW())
        ON CONFLICT (match_id, feature_set_id) DO UPDATE
            SET feature_vector = EXCLUDED.feature_vector,
                computed_at    = NOW(),
                schema_version = EXCLUDED.schema_version
        """,
        (match_id, feature_set_id, SCHEMA_VERSION, vector_to_json(vector)),
    )
    conn.commit()
    cur.close()


# ---------------------------------------------------------------------------
# Candidate selection
# ---------------------------------------------------------------------------

def get_candidate_matches(from_date: str, to_date: Optional[str], comp_type: Optional[str],
                           min_history: int, conn) -> list[int]:
    if to_date is None:
        to_date = date.today().isoformat()

    comp_filter = ""
    params: list = [from_date, to_date]
    if comp_type:
        comp_filter = "AND LOWER(c.competition_type) LIKE %s"
        params.append(f"%{comp_type.lower()}%")

    cur = conn.cursor()
    cur.execute(
        f"""
        SELECT m.match_id
        FROM v4.matches m
        LEFT JOIN v4.competitions c ON c.competition_id = m.competition_id
        WHERE m.home_score IS NOT NULL
          AND m.match_date >= %s
          AND m.match_date <= %s
          {comp_filter}
        ORDER BY m.match_date ASC
        """,
        params,
    )
    candidate_ids = [row[0] for row in cur.fetchall()]
    cur.close()

    if min_history <= 0:
        return candidate_ids

    # Club appearance count (for min_history filter)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT club_id, COUNT(*) AS cnt FROM (
            SELECT home_club_id AS club_id FROM v4.matches WHERE home_score IS NOT NULL
            UNION ALL
            SELECT away_club_id FROM v4.matches WHERE home_score IS NOT NULL
        ) sub GROUP BY club_id
        """
    )
    club_counts: dict[int, int] = {int(cid): int(cnt) for cid, cnt in cur.fetchall()}
    cur.close()

    if not candidate_ids:
        return []

    placeholders = ",".join(["%s"] * len(candidate_ids))
    cur = conn.cursor()
    cur.execute(
        f"SELECT match_id, home_club_id, away_club_id FROM v4.matches WHERE match_id IN ({placeholders})",
        candidate_ids,
    )
    match_clubs = {int(row[0]): (int(row[1]), int(row[2])) for row in cur.fetchall()}
    cur.close()

    return [
        mid for mid in candidate_ids
        if mid in match_clubs
        and club_counts.get(match_clubs[mid][0], 0) >= min_history
        and club_counts.get(match_clubs[mid][1], 0) >= min_history
    ]


# ---------------------------------------------------------------------------
# Main batch entry point
# ---------------------------------------------------------------------------

def run_batch(from_date: str = "2015-01-01",
              to_date: Optional[str] = None,
              comp_type: Optional[str] = None,
              min_history: int = 5,
              feature_set_id: str = FEATURE_SET_ID,
              dry_run: bool = False,
              batch_size: int = 500) -> None:

    if to_date is None:
        to_date = date.today().isoformat()

    logger.info(f"Batch start: {from_date} → {to_date}, comp_type={comp_type}, min_history={min_history}")

    conn = get_connection()
    try:
        # Load all data into memory
        history = load_all_history(conn)
        club_idx       = build_club_index(history)
        season_idx     = build_season_index(history)
        matchday_idx   = build_matchday_index(history)
        odds_map       = load_all_odds(conn)
        elo_idx        = build_elo_index(history)
        h2h_idx        = build_h2h_index(history)
        last_match_idx = build_last_match_index(history)
        impact_idx     = load_player_impact_scores(conn)

        # Load target matches
        target = load_all_matches(from_date, to_date, comp_type, conn)
        logger.info(f"Target matches: {len(target):,}")

        # Apply min_history filter
        if min_history > 0:
            app_counts = {}
            for _, row in history.iterrows():
                app_counts[int(row.home_club_id)] = app_counts.get(int(row.home_club_id), 0) + 1
                app_counts[int(row.away_club_id)] = app_counts.get(int(row.away_club_id), 0) + 1
            mask = target.apply(
                lambda r: app_counts.get(int(r.home_club_id), 0) >= min_history
                       and app_counts.get(int(r.away_club_id), 0) >= min_history,
                axis=1,
            )
            target = target[mask].reset_index(drop=True)
            logger.info(f"After min_history={min_history} filter: {len(target):,} matches")

        # Build lineup index for all target matches (bulk load)
        target_ids = target["match_id"].astype(int).tolist()
        lineup_idx = build_match_lineup_index(target_ids, conn)

        ok = err = 0
        pending: list[tuple] = []

        for i, row in enumerate(target.itertuples(), 1):
            try:
                vector = build_feature_vector(
                    row, club_idx, season_idx, matchday_idx, odds_map,
                    elo_idx=elo_idx, h2h_idx=h2h_idx, last_match_idx=last_match_idx,
                    lineup_idx=lineup_idx, impact_idx=impact_idx,
                )
                if not dry_run:
                    pending.append((
                        int(row.match_id), feature_set_id, SCHEMA_VERSION, vector_to_json(vector)
                    ))
                    if len(pending) >= batch_size:
                        store_batch(pending, conn)
                        pending.clear()
                ok += 1
            except Exception as exc:
                logger.warning(f"[{i}] match {row.match_id} failed: {exc}")
                err += 1

            if i % 10000 == 0:
                logger.info(f"Progress {i:,}/{len(target):,} — ok={ok:,} err={err}")

        # Flush remaining
        if pending:
            store_batch(pending, conn)

    finally:
        conn.close()

    logger.info(f"Done — ok={ok:,} err={err}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="V4 ML Feature Engineering Pipeline")
    parser.add_argument("--from-date",      default="2015-01-01")
    parser.add_argument("--to-date",        default=None)
    parser.add_argument("--comp-type",      default=None)
    parser.add_argument("--min-history",    type=int, default=5)
    parser.add_argument("--feature-set-id", default=FEATURE_SET_ID)
    parser.add_argument("--dry-run",        action="store_true")
    parser.add_argument("--batch-size",     type=int, default=500)

    args = parser.parse_args()
    run_batch(
        from_date=args.from_date,
        to_date=args.to_date,
        comp_type=args.comp_type,
        min_history=args.min_history,
        feature_set_id=args.feature_set_id,
        dry_run=args.dry_run,
        batch_size=args.batch_size,
    )
