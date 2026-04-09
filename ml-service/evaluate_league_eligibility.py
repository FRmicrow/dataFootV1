import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
from sklearn.metrics import log_loss

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, normalize_feature_vector
from src.models.model_utils import poisson_prob


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
REPORT_PATH = os.path.join(REPORTS_DIR, "league_specific_eligibility.json")

PRIORITY_PATTERNS = {
    "Premier League": [r"\bpremier league\b"],
    "La Liga": [r"\bla liga\b", r"\bprimera division\b"],
    "Bundesliga": [r"\bbundesliga\b"],
    "Serie A": [r"\bserie a\b"],
    "Ligue 1": [r"\bligue 1\b"],
    "Primeira Liga": [r"\bprimeira liga\b"],
    "Eredivisie": [r"\beredivisie\b"],
    "Belgian Pro League": [r"\bbelgian pro league\b", r"\bjupiler pro league\b"],
    "UEFA Champions League": [r"\buefa champions league\b", r"\bchampions league\b"],
    "UEFA Europa League": [r"\buefa europa league\b", r"^europa league$"],
    "UEFA Europa Conference League": [r"\buefa europa conference league\b", r"\bconference league\b"],
}


def get_db_connection():
    return get_connection()


def canonical_league_name(name: str) -> str:
    lower = (name or "").strip().lower()
    for canonical, patterns in PRIORITY_PATTERNS.items():
        if any(re.search(pattern, lower) for pattern in patterns):
            return canonical
    return name


def load_registry_model_paths(model_name: str):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT path, metadata_json
            FROM V3_Model_Registry
            WHERE name = %s AND is_active = 1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (model_name,),
        )
        row = cur.fetchone()
        if not row:
            raise RuntimeError(f"Active registry entry not found for {model_name}")
        path, metadata_json = row
        metadata = json.loads(metadata_json) if isinstance(metadata_json, str) else metadata_json
        return path, metadata
    finally:
        conn.close()


def load_latest_registry_entry(model_name: str):
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT version, metadata_json
            FROM V3_Model_Registry
            WHERE name = %s AND is_active = 1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (model_name,),
        )
        row = cur.fetchone()
        if not row:
            return None
        version, metadata_json = row
        metadata = json.loads(metadata_json) if isinstance(metadata_json, str) else metadata_json
        return {"version": version, **metadata}
    finally:
        conn.close()


def load_master_dataset():
    conn = get_db_connection()
    try:
        query = """
            SELECT
                f.fixture_id,
                f.league_id,
                l.name AS league_name,
                f.date AS match_date,
                f.goals_home,
                f.goals_away,
                f.score_halftime_home,
                f.score_halftime_away,
                fs_home.corner_kicks AS home_corners,
                fs_away.corner_kicks AS away_corners,
                fs_home.yellow_cards AS home_yellow_raw,
                fs_away.yellow_cards AS away_yellow_raw,
                COALESCE(fs_home.yellow_cards, 0) + COALESCE(fs_home.red_cards, 0) AS home_cards,
                COALESCE(fs_away.yellow_cards, 0) + COALESCE(fs_away.red_cards, 0) AS away_cards,
                fs.feature_vector
            FROM V3_Fixtures f
            JOIN V3_ML_Feature_Store fs ON f.fixture_id = fs.fixture_id
            LEFT JOIN V3_Fixture_Stats fs_home
              ON f.fixture_id = fs_home.fixture_id
             AND f.home_team_id = fs_home.team_id
             AND fs_home.half = 'FT'
            LEFT JOIN V3_Fixture_Stats fs_away
              ON f.fixture_id = fs_away.fixture_id
             AND f.away_team_id = fs_away.team_id
             AND fs_away.half = 'FT'
            LEFT JOIN V3_Leagues l ON f.league_id = l.league_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
            ORDER BY f.date ASC
        """
        df = pd.read_sql_query(query, conn)
    finally:
        conn.close()

    df["match_date"] = pd.to_datetime(df["match_date"], utc=True)
    raw_features = df["feature_vector"].apply(json.loads).tolist()
    feature_frame = pd.DataFrame(
        [normalize_feature_vector(vector) for vector in raw_features],
        columns=GLOBAL_1X2_FEATURE_COLUMNS,
    )
    df = pd.concat([df.drop(columns=["feature_vector"]), feature_frame], axis=1)
    df["actual_ft"] = np.where(df["goals_home"] > df["goals_away"], 1, np.where(df["goals_home"] < df["goals_away"], 2, 0))
    df["canonical_name"] = df["league_name"].apply(canonical_league_name)
    return df


def calculate_1n2_probs(home_mu: float, away_mu: float, max_goals: int = 8):
    p_1 = p_n = p_2 = 0.0
    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            prob = poisson_prob(home_mu, h) * poisson_prob(away_mu, a)
            if h > a:
                p_1 += prob
            elif h == a:
                p_n += prob
            else:
                p_2 += prob
    total = p_1 + p_n + p_2 or 1.0
    return [p_n / total, p_1 / total, p_2 / total]


def summarize_ft(df: pd.DataFrame, model) -> dict:
    split_idx = int(len(df) * 0.85)
    test_df = df.iloc[split_idx:].copy()
    probs = model.predict_proba(test_df[GLOBAL_1X2_FEATURE_COLUMNS])
    preds = np.argmax(probs, axis=1)
    test_df["pred_class"] = preds
    test_df["prob_draw"] = probs[:, 0]
    test_df["prob_home"] = probs[:, 1]
    test_df["prob_away"] = probs[:, 2]

    rows = []
    for (league_id, league_name, canonical_name), group in test_df.groupby(["league_id", "league_name", "canonical_name"]):
        y_true = group["actual_ft"].to_numpy()
        group_probs = group[["prob_draw", "prob_home", "prob_away"]].to_numpy()
        y_one_hot = np.zeros((len(y_true), 3))
        y_one_hot[np.arange(len(y_true)), y_true] = 1
        rows.append({
            "league_id": int(league_id),
            "league_name": league_name,
            "canonical_name": canonical_name,
            "ft_matches": int(len(group)),
            "ft_accuracy": float(np.mean(group["pred_class"].to_numpy() == y_true)),
            "ft_log_loss": float(log_loss(y_true, group_probs, labels=[0, 1, 2])),
            "ft_brier": float(np.mean(np.sum((group_probs - y_one_hot) ** 2, axis=1))),
        })
    return {row["league_id"]: row for row in rows}


def summarize_ht(df: pd.DataFrame, home_model, away_model) -> dict:
    split_idx = int(len(df) * 0.8)
    test_df = df.iloc[split_idx:].copy()
    X_test = test_df[GLOBAL_1X2_FEATURE_COLUMNS]
    home_mu = np.maximum(home_model.predict(X_test), 0.01)
    away_mu = np.maximum(away_model.predict(X_test), 0.01)
    probs = np.array([calculate_1n2_probs(h, a, max_goals=5) for h, a in zip(home_mu, away_mu)])
    preds = np.argmax(probs, axis=1)
    test_df["pred_class"] = preds
    test_df["prob_draw"] = probs[:, 0]
    test_df["prob_home"] = probs[:, 1]
    test_df["prob_away"] = probs[:, 2]

    rows = {}
    for (league_id, _league_name), group in test_df.groupby(["league_id", "league_name"]):
        y_true = group["actual_ht"].to_numpy()
        group_probs = group[["prob_draw", "prob_home", "prob_away"]].to_numpy()
        rows[int(league_id)] = {
            "ht_matches": int(len(group)),
            "ht_accuracy": float(np.mean(group["pred_class"].to_numpy() == y_true)),
            "ht_log_loss": float(log_loss(y_true, group_probs, labels=[0, 1, 2])),
        }
    return rows


def summarize_total_market(df: pd.DataFrame, home_model, away_model, target_home: str, target_away: str, threshold: float, prefix: str):
    split_idx = int(len(df) * 0.8)
    test_df = df.iloc[split_idx:].copy()
    X_test = test_df[GLOBAL_1X2_FEATURE_COLUMNS]
    pred_home = np.maximum(home_model.predict(X_test), 0.01)
    pred_away = np.maximum(away_model.predict(X_test), 0.01)
    actual_total = test_df[target_home].to_numpy() + test_df[target_away].to_numpy()
    pred_total = pred_home + pred_away

    rows = {}
    for (league_id, _league_name), group in test_df.assign(actual_total=actual_total, pred_total=pred_total).groupby(["league_id", "league_name"]):
        rows[int(league_id)] = {
            f"{prefix}_matches": int(len(group)),
            f"{prefix}_rmse": float(np.sqrt(np.mean((group["pred_total"] - group["actual_total"]) ** 2))),
            f"{prefix}_over_accuracy": float(np.mean((group["pred_total"] > threshold) == (group["actual_total"] > threshold))),
        }
    return rows


def merge_rows(*maps):
    merged = defaultdict(dict)
    for mp in maps:
        for league_id, payload in mp.items():
            merged[league_id].update(payload)
    return merged


def add_full_counts(merged, df: pd.DataFrame, column_name: str):
    for league_id, count in df.groupby("league_id").size().items():
        merged[int(league_id)][column_name] = int(count)
    return merged


def build_policy(rows):
    for row in rows:
        ft_matches = row.get("ft_total_matches", 0)
        goals_matches = row.get("goals_total_matches", 0)
        corners_matches = row.get("corners_total_matches", 0)
        cards_matches = row.get("cards_total_matches", 0)

        row["eligible_for_experiment"] = bool(
            ft_matches >= 3000 and goals_matches >= 3000 and corners_matches >= 500 and cards_matches >= 500
        )
        row["activation_allowed"] = False
        row["recommended_scope"] = "league_experiment_candidate" if row["eligible_for_experiment"] else "global_only"
        row["activation_rule"] = "Requires league model to beat active global baseline out-of-sample on target market and calibration."
    return rows


def main():
    os.makedirs(REPORTS_DIR, exist_ok=True)

    ft_model_path, ft_meta = load_registry_model_paths("global_1x2")
    ft_model = joblib.load(ft_model_path)

    ht_dir, ht_meta = load_registry_model_paths("global_ht_1x2")
    ht_home = CatBoostRegressor()
    ht_away = CatBoostRegressor()
    ht_home.load_model(ht_meta["model_paths"]["home"])
    ht_away.load_model(ht_meta["model_paths"]["away"])

    goals_dir, goals_meta = load_registry_model_paths("global_goals_ou")
    goals_home = CatBoostRegressor()
    goals_away = CatBoostRegressor()
    goals_home.load_model(goals_meta["model_paths"]["home"])
    goals_away.load_model(goals_meta["model_paths"]["away"])

    corners_dir, corners_meta = load_registry_model_paths("global_corners_ou")
    corners_home = CatBoostRegressor()
    corners_away = CatBoostRegressor()
    corners_home.load_model(corners_meta["model_paths"]["home"])
    corners_away.load_model(corners_meta["model_paths"]["away"])

    cards_dir, cards_meta = load_registry_model_paths("global_cards_ou")
    cards_home = CatBoostRegressor()
    cards_away = CatBoostRegressor()
    cards_home.load_model(cards_meta["model_paths"]["home"])
    cards_away.load_model(cards_meta["model_paths"]["away"])

    master_df = load_master_dataset()
    ht_df = master_df.dropna(subset=["score_halftime_home", "score_halftime_away"]).copy()
    ht_df["actual_ht"] = np.where(ht_df["score_halftime_home"] > ht_df["score_halftime_away"], 1, np.where(ht_df["score_halftime_home"] < ht_df["score_halftime_away"], 2, 0))
    goals_df = master_df.dropna(subset=["goals_home", "goals_away"]).copy()
    goals_df["target_home_goals"] = pd.to_numeric(goals_df["goals_home"], errors="coerce").astype(int)
    goals_df["target_away_goals"] = pd.to_numeric(goals_df["goals_away"], errors="coerce").astype(int)
    corners_df = master_df.dropna(subset=["home_corners", "away_corners"]).copy()
    corners_df["target_home_corners"] = pd.to_numeric(corners_df["home_corners"], errors="coerce").astype(int)
    corners_df["target_away_corners"] = pd.to_numeric(corners_df["away_corners"], errors="coerce").astype(int)
    cards_df = master_df.dropna(subset=["home_yellow_raw", "away_yellow_raw"]).copy()
    cards_df["target_home_cards"] = pd.to_numeric(cards_df["home_cards"], errors="coerce").astype(int)
    cards_df["target_away_cards"] = pd.to_numeric(cards_df["away_cards"], errors="coerce").astype(int)

    merged = merge_rows(
        summarize_ft(master_df, ft_model),
        summarize_ht(ht_df, ht_home, ht_away),
        summarize_total_market(goals_df, goals_home, goals_away, "target_home_goals", "target_away_goals", 2.5, "goals"),
        summarize_total_market(corners_df, corners_home, corners_away, "target_home_corners", "target_away_corners", 9.5, "corners"),
        summarize_total_market(cards_df, cards_home, cards_away, "target_home_cards", "target_away_cards", 4.5, "cards"),
    )
    add_full_counts(merged, master_df, "ft_total_matches")
    add_full_counts(merged, ht_df, "ht_total_matches")
    add_full_counts(merged, goals_df, "goals_total_matches")
    add_full_counts(merged, corners_df, "corners_total_matches")
    add_full_counts(merged, cards_df, "cards_total_matches")

    rows = []
    for league_id, payload in merged.items():
        trained_entry = load_latest_registry_entry(f"league_1x2_ft_{league_id}")
        rows.append({
            "league_id": league_id,
            **payload,
            "trained_league_model": trained_entry,
        })

    rows = build_policy(rows)
    rows.sort(key=lambda row: (-row.get("ft_matches", 0), row.get("canonical_name") or row.get("league_name") or ""))

    priority_rows = [
        row for row in rows
        if row.get("canonical_name") in PRIORITY_PATTERNS
    ]

    report = {
        "generated_at": pd.Timestamp.utcnow().isoformat(),
        "policy": {
            "eligible_for_experiment": {
                "ft_matches_min": 1500,
                "goals_matches_min": 1000,
                "corners_matches_min": 500,
                "cards_matches_min": 500,
            },
            "activation_allowed": "false_until_specialized_model_beats_global_out_of_sample",
        },
        "active_models": {
            "1N2_FT": ft_meta,
            "1N2_HT": ht_meta,
            "GOALS_OU": goals_meta,
            "CORNERS_OU": corners_meta,
            "CARDS_OU": cards_meta,
        },
        "priority_leagues": priority_rows,
        "top_by_ft_volume": rows[:30],
    }

    Path(REPORT_PATH).write_text(json.dumps(report, indent=2))
    print(f"Wrote report to {REPORT_PATH}")
    print(json.dumps(priority_rows[:12], indent=2))


if __name__ == "__main__":
    main()
