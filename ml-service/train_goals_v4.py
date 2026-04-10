"""
train_goals_v4.py — Train Poisson regressors for FT goals (home + away) on V4 data.

Data source: v4.ml_feature_store JOIN v4.matches
Targets:     home_score, away_score (integer counts → Poisson regression)
Model:       CatBoostRegressor with Poisson loss
Output:      models/v4/goals/model_goals_home.cbm + model_goals_away.cbm

Usage:
    python train_goals_v4.py [--trials N] [--no-tune]
"""

import argparse
import json
import logging
import os
import sys

import numpy as np
import optuna
import pandas as pd
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import TimeSeriesSplit

from db_config import get_connection
from features_v4_pipeline import V4_FEATURE_COLUMNS, vector_from_json

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)
optuna.logging.set_verbosity(optuna.logging.WARNING)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR  = os.path.join(BASE_DIR, "models", "v4", "goals")
HOME_PATH  = os.path.join(MODEL_DIR, "model_goals_home.cbm")
AWAY_PATH  = os.path.join(MODEL_DIR, "model_goals_away.cbm")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")
FEATURE_SET_ID = "v4_global_1x2_v1"


def load_dataset() -> pd.DataFrame:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT fs.match_id, m.match_date, m.home_score, m.away_score, fs.feature_vector
            FROM v4.ml_feature_store fs
            JOIN v4.matches m ON m.match_id = fs.match_id
            WHERE fs.feature_set_id = %s
              AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
            ORDER BY m.match_date ASC
            """,
            (FEATURE_SET_ID,),
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()

    logger.info(f"Loaded {len(rows)} rows")
    records = []
    for match_id, match_date, home_score, away_score, fv_raw in rows:
        try:
            vector = vector_from_json(fv_raw) if isinstance(fv_raw, str) else fv_raw
            row = {col: vector.get(col, np.nan) for col in V4_FEATURE_COLUMNS}
            row["__home_score__"] = int(home_score)
            row["__away_score__"] = int(away_score)
            row["__match_date__"] = match_date
            records.append(row)
        except Exception as exc:
            logger.warning(f"Skipping match {match_id}: {exc}")

    df = pd.DataFrame(records)
    df["__match_date__"] = pd.to_datetime(df["__match_date__"])
    df.sort_values("__match_date__", inplace=True)
    return df.reset_index(drop=True)


def objective(trial, X, y):
    params = {
        "iterations":     trial.suggest_int("iterations", 200, 1200),
        "learning_rate":  trial.suggest_float("learning_rate", 1e-3, 0.1, log=True),
        "depth":          trial.suggest_int("depth", 4, 10),
        "l2_leaf_reg":    trial.suggest_float("l2_leaf_reg", 1e-2, 10.0, log=True),
        "loss_function":  "Poisson",
        "eval_metric":    "RMSE",
        "verbose":        False,
        "random_seed":    42,
        "allow_writing_files": False,
    }
    tscv = TimeSeriesSplit(n_splits=3)
    scores = []
    for tr_idx, val_idx in tscv.split(X):
        m = CatBoostRegressor(**params)
        m.fit(X.iloc[tr_idx], y[tr_idx], eval_set=(X.iloc[val_idx], y[val_idx]),
              early_stopping_rounds=50, verbose=False)
        pred = np.clip(m.predict(X.iloc[val_idx]), 0, 15)
        scores.append(np.sqrt(mean_squared_error(y[val_idx], pred)))
    return float(np.mean(scores))


def train_side(X_train, X_test, y_train, y_test, label, n_trials, no_tune):
    if no_tune:
        params = {"iterations": 500, "learning_rate": 0.03, "depth": 6, "l2_leaf_reg": 3.0,
                  "loss_function": "Poisson", "eval_metric": "RMSE", "verbose": 100, "random_seed": 42}
    else:
        study = optuna.create_study(direction="minimize")
        study.optimize(lambda trial: objective(trial, X_train, y_train), n_trials=n_trials)
        params = study.best_params
        params.update({"loss_function": "Poisson", "eval_metric": "RMSE", "verbose": 100,
                       "random_seed": 42, "allow_writing_files": False})

    model = CatBoostRegressor(**params)
    model.fit(X_train, y_train, eval_set=(X_test, y_test),
              early_stopping_rounds=50, verbose=100)

    pred = np.clip(model.predict(X_test), 0, 15)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    mae  = mean_absolute_error(y_test, pred)
    logger.info(f"[{label}] RMSE={rmse:.4f}  MAE={mae:.4f}")
    return model, {"rmse": round(rmse, 4), "mae": round(mae, 4)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials",  type=int, default=20)
    parser.add_argument("--no-tune", action="store_true")
    args = parser.parse_args()

    os.makedirs(MODEL_DIR, exist_ok=True)
    df = load_dataset()
    X = df[V4_FEATURE_COLUMNS]
    split = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split], X.iloc[split:]

    metrics = {}

    home_model, home_m = train_side(
        X_train, X_test,
        df["__home_score__"].values[:split], df["__home_score__"].values[split:],
        "home", args.trials, args.no_tune
    )
    home_model.save_model(HOME_PATH)
    metrics["home"] = home_m

    away_model, away_m = train_side(
        X_train, X_test,
        df["__away_score__"].values[:split], df["__away_score__"].values[split:],
        "away", args.trials, args.no_tune
    )
    away_model.save_model(AWAY_PATH)
    metrics["away"] = away_m

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info(f"Saved: {HOME_PATH} | {AWAY_PATH}")


if __name__ == "__main__":
    main()
