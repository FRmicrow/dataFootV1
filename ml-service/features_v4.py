"""
features_v4.py — Feature engineering for V4 (Transfermarkt) matches.

Computes the same 130-column feature vector as the V3 pipeline,
reading from v4.* tables instead of V3_* tables.

Missing features in V4 (Elo, lineup_strength, player ratings) are set to 0.0.
CatBoost handles missing values natively, so model accuracy is minimally affected.
"""

import numpy as np
import pandas as pd
from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, normalize_feature_vector
from src.models.model_utils import get_logger

logger = get_logger(__name__)


def safe_num(value, default=0.0):
    try:
        v = float(value)
        if pd.isna(v) or np.isinf(v):
            return default
        return v
    except (TypeError, ValueError):
        return default


def safe_div(num, den, default=0.0):
    n, d = safe_num(num), safe_num(den)
    return n / d if d != 0 else default


# ---------------------------------------------------------------------------
# Match context from V4
# ---------------------------------------------------------------------------

def get_match_context_v4(match_id: int, conn) -> dict:
    """Returns essential match metadata from v4.matches."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT m.match_id, m.match_date, m.home_club_id, m.away_club_id,
               m.competition_id, m.season_label, m.xg_home, m.xg_away,
               comp.competition_type, comp.name AS competition_name,
               hc.name AS home_team_name,
               ac.name AS away_team_name
        FROM v4.matches m
        JOIN v4.clubs hc ON m.home_club_id = hc.club_id
        JOIN v4.clubs ac ON m.away_club_id = ac.club_id
        LEFT JOIN v4.competitions comp ON m.competition_id = comp.competition_id
        WHERE m.match_id = %s
        """,
        (match_id,),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        raise ValueError(f"V4 match {match_id} not found.")

    cols = [
        "match_id", "match_date", "home_club_id", "away_club_id",
        "competition_id", "season_label", "xg_home", "xg_away",
        "competition_type", "competition_name",
        "home_team_name", "away_team_name",
    ]
    return dict(zip(cols, row))


# ---------------------------------------------------------------------------
# Rolling team history from V4
# ---------------------------------------------------------------------------

def get_team_history_v4(club_id: int, before_date, competition_id, limit: int, conn) -> pd.DataFrame:  # noqa: ARG001
    """
    Returns completed matches for a club before a given date across ALL competitions,
    ordered by match_date DESC (most recent first).
    competition_id parameter kept for backward compatibility but no longer used as filter.
    Joined with v4.match_stats for performance metrics.
    """
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            m.match_id,
            m.match_date,
            m.home_club_id,
            m.away_club_id,
            m.home_score,
            m.away_score,
            m.xg_home,
            m.xg_away,
            -- Determine team perspective (home=1, away=0)
            CASE WHEN m.home_club_id = %s THEN 1 ELSE 0 END AS is_home,
            -- Team score and opponent score
            CASE WHEN m.home_club_id = %s THEN m.home_score ELSE m.away_score END AS team_score,
            CASE WHEN m.home_club_id = %s THEN m.away_score ELSE m.home_score END AS opp_score,
            -- xG
            CASE WHEN m.home_club_id = %s THEN m.xg_home  ELSE m.xg_away  END AS team_xg,
            CASE WHEN m.home_club_id = %s THEN m.xg_away  ELSE m.xg_home  END AS opp_xg,
            -- Match stats (may be NULL for older matches)
            ms.home_yellows_ft, ms.away_yellows_ft,
            ms.home_corners_ft, ms.away_corners_ft,
            ms.home_poss_ft,    ms.away_poss_ft,
            ms.home_shots_ot_ft, ms.away_shots_ot_ft,
            ms.home_shots_ft,   ms.away_shots_ft,
            ms.home_shots_ot_1h, ms.away_shots_ot_1h,
            ms.home_corners_1h, ms.away_corners_1h
        FROM v4.matches m
        LEFT JOIN v4.match_stats ms ON ms.match_id = m.match_id
        WHERE (m.home_club_id = %s OR m.away_club_id = %s)
          AND m.home_score IS NOT NULL
          AND m.match_date < %s
        ORDER BY m.match_date DESC
        LIMIT %s
        """,
        (club_id, club_id, club_id, club_id, club_id, club_id, club_id, before_date, limit),
    )
    rows = cur.fetchall()
    cur.close()

    columns = [
        "match_id", "match_date", "home_club_id", "away_club_id",
        "home_score", "away_score", "xg_home", "xg_away",
        "is_home", "team_score", "opp_score", "team_xg", "opp_xg",
        "home_yellows_ft", "away_yellows_ft",
        "home_corners_ft", "away_corners_ft",
        "home_poss_ft", "away_poss_ft",
        "home_shots_ot_ft", "away_shots_ot_ft",
        "home_shots_ft", "away_shots_ft",
        "home_shots_ot_1h", "away_shots_ot_1h",
        "home_corners_1h", "away_corners_1h",
    ]
    df = pd.DataFrame(rows, columns=columns)

    if df.empty:
        return df

    # Perspective-aware columns
    df["team_yellows"] = df.apply(
        lambda r: r.home_yellows_ft if r.is_home else r.away_yellows_ft, axis=1
    )
    df["team_corners"] = df.apply(
        lambda r: r.home_corners_ft if r.is_home else r.away_corners_ft, axis=1
    )
    df["team_poss"] = df.apply(
        lambda r: r.home_poss_ft if r.is_home else r.away_poss_ft, axis=1
    )
    df["team_sot"] = df.apply(
        lambda r: r.home_shots_ot_ft if r.is_home else r.away_shots_ot_ft, axis=1
    )
    df["team_shots"] = df.apply(
        lambda r: r.home_shots_ft if r.is_home else r.away_shots_ft, axis=1
    )
    df["team_sot_1h"] = df.apply(
        lambda r: r.home_shots_ot_1h if r.is_home else r.away_shots_ot_1h, axis=1
    )
    df["team_corners_1h"] = df.apply(
        lambda r: r.home_corners_1h if r.is_home else r.away_corners_1h, axis=1
    )
    df["goal_diff"] = df["team_score"] - df["opp_score"]
    df["points"] = df["goal_diff"].apply(lambda gd: 3 if gd > 0 else (1 if gd == 0 else 0))
    df["win"] = (df["goal_diff"] > 0).astype(int)
    df["clean_sheet"] = (df["opp_score"] == 0).astype(int)

    return df


def rolling_mean(series, n, default=0.0):
    vals = series.dropna().head(n)
    return float(vals.mean()) if len(vals) > 0 else default


def compute_momentum(df: pd.DataFrame, prefix: str) -> dict:
    """Compute rolling momentum features for windows 3, 5, 10, 20."""
    feats = {}
    gd = df["goal_diff"]
    pts = df["points"]
    win = df["win"]
    cs = df["clean_sheet"]
    xg_f = df["team_xg"]
    xg_a = df["opp_xg"]

    for n in [3, 5, 10, 20]:
        feats[f"mom_gd_{prefix}{n}"] = rolling_mean(gd, n)
        feats[f"mom_pts_{prefix}{n}"] = rolling_mean(pts, n)

    feats[f"win_rate_{prefix}5"] = rolling_mean(win, 5)
    feats[f"win_rate_{prefix}10"] = rolling_mean(win, 10)
    feats[f"cs_rate_{prefix}5"] = rolling_mean(cs, 5)
    feats[f"cs_rate_{prefix}10"] = rolling_mean(cs, 10)

    feats[f"mom_xg_f_{prefix}5"] = rolling_mean(xg_f, 5)
    feats[f"mom_xg_f_{prefix}10"] = rolling_mean(xg_f, 10)
    feats[f"mom_xg_a_{prefix}5"] = rolling_mean(xg_a, 5)
    feats[f"mom_xg_a_{prefix}10"] = rolling_mean(xg_a, 10)

    xg_eff = xg_f.head(5) - xg_a.head(5)
    feats[f"xg_eff_{prefix}5"] = float(xg_eff.mean()) if len(xg_eff) > 0 else 0.0

    return feats


def compute_performance(df: pd.DataFrame, prefix: str) -> dict:
    """Compute per-match performance averages over last 5 matches."""
    n = 5
    feats = {}

    def avg(col, default=0.0):
        vals = df[col].dropna().head(n)
        return float(vals.mean()) if len(vals) > 0 else default

    feats[f"{prefix}possession_avg_5"] = avg("team_poss")
    shots_5 = avg("team_shots")
    sot_5 = avg("team_sot")
    feats[f"{prefix}shots_per_match_5"] = shots_5
    feats[f"{prefix}sot_per_match_5"] = sot_5
    feats[f"{prefix}corners_per_match_5"] = avg("team_corners")
    feats[f"{prefix}yellow_per_match_5"] = avg("team_yellows")
    feats[f"{prefix}red_per_match_5"] = 0.0  # Not in v4.match_stats
    feats[f"{prefix}fouls_per_match_5"] = 0.0  # Not in v4.match_stats

    feats[f"{prefix}pass_acc_rate_5"] = 0.0   # Not in v4.match_stats
    feats[f"{prefix}sot_rate_5"] = safe_div(sot_5, shots_5)
    feats[f"{prefix}non_sot_rate_5"] = 1.0 - feats[f"{prefix}sot_rate_5"]

    sot_1h_5 = avg("team_sot_1h")
    feats[f"{prefix}shot_volume_1h_share_5"] = safe_div(sot_1h_5, sot_5)
    feats[f"{prefix}sot_volume_1h_share_5"] = feats[f"{prefix}shot_volume_1h_share_5"]

    corners_1h_5 = avg("team_corners_1h")
    corners_5 = avg("team_corners")
    feats[f"{prefix}corner_volume_1h_share_5"] = safe_div(corners_1h_5, corners_5)

    feats[f"{prefix}corner_to_shot_rate_5"] = safe_div(corners_5, shots_5)

    yellows_5 = avg("team_yellows")
    feats[f"{prefix}cards_per_foul_5"] = 0.0   # No fouls in V4
    feats[f"{prefix}cards_pressure_5"] = yellows_5

    poss_5 = avg("team_poss")
    feats[f"{prefix}possession_to_shot_5"] = safe_div(shots_5, poss_5)

    xg_f_5 = avg("team_xg")
    feats[f"{prefix}xg_per_shot_5"] = safe_div(xg_f_5, shots_5)
    feats[f"{prefix}xg_per_sot_5"] = safe_div(xg_f_5, sot_5)

    # Control index (composite)
    feats[f"{prefix}control_index_5"] = safe_div(poss_5 * sot_5, 100.0)

    return feats


# ---------------------------------------------------------------------------
# Season standings from V4
# ---------------------------------------------------------------------------

def get_standings_v4(club_id: int, competition_id: int, season_label: str, conn) -> dict:
    """Get club standings from v4.team_season_xg."""
    cur = conn.cursor()
    cur.execute(
        """
        SELECT position, matches, wins, draws, losses, goals, goals_against, points, xg
        FROM v4.team_season_xg
        WHERE club_id = %s
          AND competition_id = %s
          AND season_label = %s
        """,
        (club_id, competition_id, season_label),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        return {}
    keys = ["position", "matches", "wins", "draws", "losses", "goals", "goals_against", "points", "xg"]
    d = dict(zip(keys, row))
    d["goals_diff"] = safe_num(d.get("goals", 0)) - safe_num(d.get("goals_against", 0))
    return d


# ---------------------------------------------------------------------------
# Contextual features
# ---------------------------------------------------------------------------

def compute_contextual(context: dict) -> dict:
    competition_type = (context.get("competition_type") or "").lower()
    is_cup = 1 if "cup" in competition_type else 0
    is_league = 1 if "league" in competition_type else 0
    is_international = 1 if "international" in competition_type or "european" in competition_type else 0

    return {
        "competition_importance": 5,    # neutral default — no importance_rank in v4.competitions
        "country_importance": 5,
        "is_cup": is_cup,
        "is_league": is_league,
        "is_international_competition": is_international,
        "is_knockout": is_cup,
        "stage_weight": 0.5,
        "is_derby": 0,
        "travel_km": 0.0,
        "high_stakes": 0,
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def compute_features_from_v4(match_id: int) -> dict:
    """
    Computes the full 130-column feature vector for a V4 match.
    Returns a dict compatible with GLOBAL_1X2_FEATURE_COLUMNS.
    """
    conn = get_connection()
    try:
        ctx = get_match_context_v4(match_id, conn)
        match_date = ctx["match_date"]
        home_id = ctx["home_club_id"]
        away_id = ctx["away_club_id"]
        competition_id = ctx["competition_id"]
        season_label = ctx["season_label"]

        # Historical match data (last 20 for each team, same competition)
        home_hist = get_team_history_v4(home_id, match_date, competition_id, 20, conn)
        away_hist = get_team_history_v4(away_id, match_date, competition_id, 20, conn)

        feats = {}

        # --- Momentum ---
        if not home_hist.empty:
            feats.update(compute_momentum(home_hist, "h"))
        else:
            for n in [3, 5, 10, 20]:
                feats[f"mom_gd_h{n}"] = 0.0
                feats[f"mom_pts_h{n}"] = 0.0
            feats.update({k: 0.0 for k in ["win_rate_h5", "win_rate_h10", "cs_rate_h5", "cs_rate_h10",
                                            "mom_xg_f_h5", "mom_xg_f_h10", "mom_xg_a_h5", "mom_xg_a_h10", "xg_eff_h5"]})

        if not away_hist.empty:
            feats.update(compute_momentum(away_hist, "a"))
        else:
            for n in [3, 5, 10, 20]:
                feats[f"mom_gd_a{n}"] = 0.0
                feats[f"mom_pts_a{n}"] = 0.0
            feats.update({k: 0.0 for k in ["win_rate_a5", "win_rate_a10", "cs_rate_a5", "cs_rate_a10",
                                            "mom_xg_f_a5", "mom_xg_f_a10", "mom_xg_a_a5", "mom_xg_a_a10", "xg_eff_a5"]})

        # --- xG diffs ---
        feats["diff_xg_for_l5"] = feats.get("mom_xg_f_h5", 0.0) - feats.get("mom_xg_f_a5", 0.0)
        feats["diff_xg_against_l5"] = feats.get("mom_xg_a_h5", 0.0) - feats.get("mom_xg_a_a5", 0.0)
        feats["diff_xg_eff_l5"] = feats.get("xg_eff_h5", 0.0) - feats.get("xg_eff_a5", 0.0)

        # --- Rest days ---
        feats["rest_h"] = 7.0   # Default — V4 has no fixture schedule density
        feats["rest_a"] = 7.0

        # --- Venue diff (home/away form) ---
        if not home_hist.empty:
            home_home = home_hist[home_hist["is_home"] == 1]
            feats["venue_diff_h"] = rolling_mean(home_home["goal_diff"], 5)
        else:
            feats["venue_diff_h"] = 0.0

        if not away_hist.empty:
            away_away = away_hist[away_hist["is_home"] == 0]
            feats["venue_diff_a"] = rolling_mean(away_away["goal_diff"], 5)
        else:
            feats["venue_diff_a"] = 0.0

        # --- Defensive resilience (avg goals conceded) ---
        feats["def_res_h"] = rolling_mean(home_hist["opp_score"], 5) if not home_hist.empty else 0.0
        feats["def_res_a"] = rolling_mean(away_hist["opp_score"], 5) if not away_hist.empty else 0.0

        # --- Elo / lineup strength (ABSENT in V4 → 0.0) ---
        feats["home_b_elo"] = 0.0
        feats["away_b_elo"] = 0.0
        feats["diff_elo"] = 0.0
        feats["home_b_lineup_strength_v1"] = 0.0
        feats["away_b_lineup_strength_v1"] = 0.0
        feats["diff_lineup_strength"] = 0.0
        feats["home_b_missing_starters_count"] = 0.0
        feats["away_b_missing_starters_count"] = 0.0

        # --- Standings ---
        home_standings = get_standings_v4(home_id, competition_id, season_label, conn)
        away_standings = get_standings_v4(away_id, competition_id, season_label, conn)

        feats["home_b_rank"] = safe_num(home_standings.get("position", 10))
        feats["away_b_rank"] = safe_num(away_standings.get("position", 10))
        feats["diff_rank"] = feats["away_b_rank"] - feats["home_b_rank"]

        feats["home_b_points"] = safe_num(home_standings.get("points", 0))
        feats["away_b_points"] = safe_num(away_standings.get("points", 0))
        feats["diff_points"] = feats["home_b_points"] - feats["away_b_points"]

        feats["home_b_goals_diff"] = safe_num(home_standings.get("goals_diff", 0))
        feats["away_b_goals_diff"] = safe_num(away_standings.get("goals_diff", 0))
        feats["diff_goals_diff"] = feats["home_b_goals_diff"] - feats["away_b_goals_diff"]

        feats["home_b_played"] = safe_num(home_standings.get("matches", 0))
        feats["away_b_played"] = safe_num(away_standings.get("matches", 0))

        # --- Performance metrics ---
        home_perf = compute_performance(home_hist, "home_p_") if not home_hist.empty else {
            k: 0.0 for k in [col for col in GLOBAL_1X2_FEATURE_COLUMNS if col.startswith("home_p_")]
        }
        away_perf = compute_performance(away_hist, "away_p_") if not away_hist.empty else {
            k: 0.0 for k in [col for col in GLOBAL_1X2_FEATURE_COLUMNS if col.startswith("away_p_")]
        }
        feats.update(home_perf)
        feats.update(away_perf)

        # --- Performance diffs ---
        feats["diff_possession_l5"] = feats.get("home_p_possession_avg_5", 0.0) - feats.get("away_p_possession_avg_5", 0.0)
        feats["diff_control_l5"] = feats.get("home_p_control_index_5", 0.0) - feats.get("away_p_control_index_5", 0.0)
        feats["diff_shots_l5"] = feats.get("home_p_shots_per_match_5", 0.0) - feats.get("away_p_shots_per_match_5", 0.0)
        feats["diff_sot_l5"] = feats.get("home_p_sot_per_match_5", 0.0) - feats.get("away_p_sot_per_match_5", 0.0)
        feats["diff_corners_l5"] = feats.get("home_p_corners_per_match_5", 0.0) - feats.get("away_p_corners_per_match_5", 0.0)
        feats["diff_fouls_l5"] = feats.get("home_p_fouls_per_match_5", 0.0) - feats.get("away_p_fouls_per_match_5", 0.0)
        feats["diff_yellow_l5"] = feats.get("home_p_yellow_per_match_5", 0.0) - feats.get("away_p_yellow_per_match_5", 0.0)
        feats["diff_red_l5"] = 0.0

        # --- Matchup features (sum/gap between teams) ---
        h_sot = feats.get("home_p_sot_per_match_5", 0.0)
        a_sot = feats.get("away_p_sot_per_match_5", 0.0)
        h_shots = feats.get("home_p_shots_per_match_5", 0.0)
        a_shots = feats.get("away_p_shots_per_match_5", 0.0)
        h_corners = feats.get("home_p_corners_per_match_5", 0.0)
        a_corners = feats.get("away_p_corners_per_match_5", 0.0)
        h_poss = feats.get("home_p_possession_avg_5", 0.0)
        a_poss = feats.get("away_p_possession_avg_5", 0.0)
        h_yellow = feats.get("home_p_yellow_per_match_5", 0.0)
        a_yellow = feats.get("away_p_yellow_per_match_5", 0.0)
        h_ctrl = feats.get("home_p_control_index_5", 0.0)
        a_ctrl = feats.get("away_p_control_index_5", 0.0)
        h_xg_per_sot = feats.get("home_p_xg_per_sot_5", 0.0)
        a_xg_per_sot = feats.get("away_p_xg_per_sot_5", 0.0)

        feats["matchup_tempo_sum_5"] = h_shots + a_shots
        feats["matchup_shot_quality_gap_5"] = abs(h_xg_per_sot - a_xg_per_sot)
        feats["matchup_possession_gap_5"] = abs(h_poss - a_poss)
        feats["matchup_control_gap_5"] = abs(h_ctrl - a_ctrl)
        feats["matchup_corner_pressure_sum_5"] = h_corners + a_corners
        feats["matchup_discipline_sum_5"] = h_yellow + a_yellow
        feats["matchup_foul_intensity_sum_5"] = 0.0  # No fouls in V4
        feats["matchup_first_half_tempo_sum_5"] = (
            feats.get("home_p_shot_volume_1h_share_5", 0.5) * h_shots
            + feats.get("away_p_shot_volume_1h_share_5", 0.5) * a_shots
        )
        feats["matchup_first_half_sot_sum_5"] = (
            feats.get("home_p_sot_volume_1h_share_5", 0.5) * h_sot
            + feats.get("away_p_sot_volume_1h_share_5", 0.5) * a_sot
        )
        feats["matchup_open_game_index_5"] = safe_div(h_shots + a_shots, h_poss + a_poss)

        # --- Contextual ---
        feats.update(compute_contextual(ctx))

        # --- Normalize to exactly GLOBAL_1X2_FEATURE_COLUMNS ---
        return normalize_feature_vector(feats)

    finally:
        conn.close()
