"""
train_cards_v4.py — Train Poisson regressors for yellow cards (home + away) on V4 data.

Data source: v4.ml_feature_store JOIN v4.matches JOIN v4.match_stats
Targets:     home_yellows_ft, away_yellows_ft (~19k rows, top leagues 2015+)
Model:       CatBoostRegressor with Poisson loss
Output:      models/v4/cards/model_cards_home.cbm + model_cards_away.cbm
"""

import argparse
import json
import logging
import os

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
MODEL_DIR  = os.path.join(BASE_DIR, "models", "v4", "cards")
HOME_PATH  = os.path.join(MODEL_DIR, "model_cards_home.cbm")
AWAY_PATH  = os.path.join(MODEL_DIR, "model_cards_away.cbm")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")
FEATURE_SET_ID = "v4_global_1x2_v1"


def load_dataset() -> pd.DataFrame:
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT fs.match_id, m.match_date,
                   ms.home_yellows_ft, ms.away_yellows_ft,
                   fs.feature_vector
            FROM v4.ml_feature_store fs
            JOIN v4.matches m      ON m.match_id  = fs.match_id
            JOIN v4.match_stats ms ON ms.match_id = fs.match_id
            WHERE fs.feature_set_id = %s
              AND ms.home_yellows_ft IS NOT NULL
              AND ms.away_yellows_ft IS NOT NULL
            ORDER BY m.match_date ASC
            """,
            (FEATURE_SET_ID,),
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()

    logger.info(f"Loaded {len(rows)} cards rows")
    records = []
    for match_id, match_date, yellows_h, yellows_a, fv_raw in rows:
        try:
            vector = vector_from_json(fv_raw) if isinstance(fv_raw, str) else fv_raw
            row = {col: vector.get(col, np.nan) for col in V4_FEATURE_COLUMNS}
            row["__yellows_home__"] = max(0, int(yellows_h))
            row["__yellows_away__"] = max(0, int(yellows_a))
            row["__match_date__"]   = match_date
            records.append(row)
        except Exception as exc:
            logger.warning(f"Skipping match {match_id}: {exc}")

    df = pd.DataFrame(records)
    df["__match_date__"] = pd.to_datetime(df["__match_date__"])
    return df.sort_values("__match_date__").reset_index(drop=True)


def objective(trial, X, y):
    params = {
        "iterations":    trial.suggest_int("iterations", 100, 800),
        "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.1, log=True),
        "depth":         trial.suggest_int("depth", 3, 8),
        "l2_leaf_reg":   trial.suggest_float("l2_leaf_reg", 1e-2, 10.0, log=True),
        "loss_function": "Poisson",
        "eval_metric":   "RMSE",
        "verbose":       False,
        "random_seed":   42,
        "allow_writing_files": False,
    }
    tscv = TimeSeriesSplit(n_splits=3)
    scores = []
    for tr_idx, val_idx in tscv.split(X):
        m = CatBoostRegressor(**params)
        m.fit(X.iloc[tr_idx], y[tr_idx], eval_set=(X.iloc[val_idx], y[val_idx]),
              early_stopping_rounds=30, verbose=False)
        pred = np.clip(m.predict(X.iloc[val_idx]), 0, 15)
        scores.append(np.sqrt(mean_squared_error(y[val_idx], pred)))
    return float(np.mean(scores))


def train_side(X_train, X_test, y_train, y_test, label, n_trials, no_tune, path):
    if no_tune:
        params = {"iterations": 400, "learning_rate": 0.05, "depth": 5, "l2_leaf_reg": 3.0,
                  "loss_function": "Poisson", "eval_metric": "RMSE", "verbose": 100, "random_seed": 42}
    else:
        study = optuna.create_study(direction="minimize")
        study.optimize(lambda trial: objective(trial, X_train, y_train), n_trials=n_trials)
        params = study.best_params
        params.update({"loss_function": "Poisson", "eval_metric": "RMSE", "verbose": 100,
                       "random_seed": 42, "allow_writing_files": False})

    model = CatBoostRegressor(**params)
    model.fit(X_train, y_train, eval_set=(X_test, y_test), early_stopping_rounds=30, verbose=100)
    pred = np.clip(model.predict(X_test), 0, 15)
    rmse = np.sqrt(mean_squared_error(y_test, pred))
    mae  = mean_absolute_error(y_test, pred)
    logger.info(f"[Cards {label}] RMSE={rmse:.4f}  MAE={mae:.4f}")
    model.save_model(path)
    return {"rmse": round(rmse, 4), "mae": round(mae, 4)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials",  type=int, default=15)
    parser.add_argument("--no-tune", action="store_true")
    args = parser.parse_args()

    os.makedirs(MODEL_DIR, exist_ok=True)
    df = load_dataset()

    if len(df) < 500:
        logger.error(f"Not enough cards data ({len(df)} rows).")
        return

    X = df[V4_FEATURE_COLUMNS]
    split = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split], X.iloc[split:]

    metrics = {
        "home": train_side(X_train, X_test, df["__yellows_home__"].values[:split],
                           df["__yellows_home__"].values[split:], "home", args.trials, args.no_tune, HOME_PATH),
        "away": train_side(X_train, X_test, df["__yellows_away__"].values[:split],
                           df["__yellows_away__"].values[split:], "away", args.trials, args.no_tune, AWAY_PATH),
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    logger.info("Done.")


if __name__ == "__main__":
    main()
