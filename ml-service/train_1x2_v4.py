"""
train_1x2_v4.py — Train CatBoost 1X2 classifier on V4 data.

Data source: v4.ml_feature_store JOIN v4.matches (labels)
Features:    features_v4_pipeline.V4_FEATURE_COLUMNS
Target:      1 (home win), 0 (draw), 2 (away win)
Split:       Chronological 80/20 — no random split
Model:       CatBoostClassifier with Optuna tuning (3 TimeSeriesSplit folds)
Output:      models/v4/global_1x2/model_1x2.joblib + importance.json

Usage:
    python train_1x2_v4.py [--trials N] [--min-history N] [--no-tune]
"""

import argparse
import json
import logging
import os
import sys

import joblib
import numpy as np
import optuna
import pandas as pd
from catboost import CatBoostClassifier, Pool
from sklearn.metrics import accuracy_score, brier_score_loss, f1_score, log_loss
from sklearn.model_selection import TimeSeriesSplit

from db_config import get_connection
from features_v4_pipeline import V4_FEATURE_COLUMNS, vector_from_json

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)
optuna.logging.set_verbosity(optuna.logging.WARNING)

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models", "v4", "global_1x2")
MODEL_PATH = os.path.join(MODEL_DIR, "model_1x2.joblib")
IMPORTANCE_PATH = os.path.join(MODEL_DIR, "importance.json")
METRICS_PATH    = os.path.join(MODEL_DIR, "metrics.json")

FEATURE_SET_ID  = "v4_global_1x2_v1"
LABEL_MAP = {1: 1, 0: 0, -1: 2}  # goal_diff sign → class (home=1, draw=0, away=2)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_dataset(min_history: int = 5) -> pd.DataFrame:
    """
    Loads feature vectors and labels from v4.ml_feature_store.
    Labels: 1=home win, 0=draw, 2=away win (from v4.matches.home_score/away_score).
    Sorted chronologically.
    """
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                fs.match_id,
                m.match_date,
                m.home_score,
                m.away_score,
                fs.feature_vector
            FROM v4.ml_feature_store fs
            JOIN v4.matches m ON m.match_id = fs.match_id
            WHERE fs.feature_set_id = %s
              AND m.home_score IS NOT NULL
              AND m.away_score IS NOT NULL
            ORDER BY m.match_date ASC
            """,
            (FEATURE_SET_ID,),
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()

    logger.info(f"Loaded {len(rows)} feature rows from v4.ml_feature_store")

    records = []
    for match_id, match_date, home_score, away_score, feature_vector_raw in rows:
        try:
            vector = vector_from_json(feature_vector_raw) if isinstance(feature_vector_raw, str) else feature_vector_raw
            # Label: goal difference sign
            gd = int(home_score) - int(away_score)
            label = 1 if gd > 0 else (0 if gd == 0 else 2)

            row = {col: vector.get(col, np.nan) for col in V4_FEATURE_COLUMNS}
            row["__match_id__"]  = match_id
            row["__match_date__"] = match_date
            row["__label__"]     = label
            records.append(row)
        except Exception as exc:
            logger.warning(f"Skipping match {match_id}: {exc}")

    if not records:
        logger.error("No training data loaded — run features_v4_pipeline.py first")
        sys.exit(1)

    df = pd.DataFrame(records)
    df["__match_date__"] = pd.to_datetime(df["__match_date__"])
    df.sort_values("__match_date__", inplace=True)
    df.reset_index(drop=True, inplace=True)

    logger.info(f"Dataset: {len(df)} rows | label dist: {df['__label__'].value_counts().to_dict()}")
    return df


def prepare_xy(df: pd.DataFrame):
    """Split DataFrame into feature matrix X and labels y."""
    X = df[V4_FEATURE_COLUMNS].copy()
    y = df["__label__"].values
    return X, y


# ---------------------------------------------------------------------------
# Optuna objective
# ---------------------------------------------------------------------------

def objective(trial, X: pd.DataFrame, y: np.ndarray) -> float:
    params = {
        "iterations":     trial.suggest_int("iterations", 200, 1500),
        "learning_rate":  trial.suggest_float("learning_rate", 1e-3, 0.1, log=True),
        "depth":          trial.suggest_int("depth", 4, 10),
        "l2_leaf_reg":    trial.suggest_float("l2_leaf_reg", 1e-2, 10.0, log=True),
        "bootstrap_type": trial.suggest_categorical("bootstrap_type", ["Bayesian", "Bernoulli", "MVS"]),
        "random_strength": trial.suggest_float("random_strength", 1e-9, 10.0, log=True),
        "od_type":  "Iter",
        "od_wait":  50,
        "verbose":  False,
        "random_seed": 42,
        "loss_function": "MultiClass",
        "eval_metric": "MultiClass",
        "allow_writing_files": False,
    }
    if params["bootstrap_type"] == "Bernoulli":
        params["subsample"] = trial.suggest_float("subsample", 0.5, 1.0)

    tscv = TimeSeriesSplit(n_splits=3)
    scores = []
    for train_idx, val_idx in tscv.split(X):
        X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_tr, y_val = y[train_idx], y[val_idx]

        model = CatBoostClassifier(**params)
        model.fit(X_tr, y_tr, eval_set=(X_val, y_val), early_stopping_rounds=50, verbose=False)

        proba = model.predict_proba(X_val)
        scores.append(log_loss(y_val, proba))

    return float(np.mean(scores))


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train(df: pd.DataFrame, n_trials: int = 30, no_tune: bool = False) -> dict:
    X, y = prepare_xy(df)

    # Chronological 80/20 split
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    logger.info(f"Train: {len(X_train)} | Test: {len(X_test)}")

    if no_tune:
        best_params = {
            "iterations": 600,
            "learning_rate": 0.03,
            "depth": 6,
            "l2_leaf_reg": 3.0,
            "bootstrap_type": "Bayesian",
            "od_type": "Iter",
            "od_wait": 50,
            "verbose": 100,
            "random_seed": 42,
            "loss_function": "MultiClass",
            "eval_metric": "MultiClass",
        }
    else:
        logger.info(f"Optuna tuning — {n_trials} trials...")
        study = optuna.create_study(direction="minimize")
        study.optimize(lambda trial: objective(trial, X_train, y_train), n_trials=n_trials)
        best_params = study.best_params
        best_params.update({
            "od_type": "Iter",
            "od_wait": 50,
            "verbose": 100,
            "random_seed": 42,
            "loss_function": "MultiClass",
            "eval_metric": "MultiClass",
            "allow_writing_files": False,
        })
        logger.info(f"Best params: {best_params}")

    final_model = CatBoostClassifier(**best_params)
    final_model.fit(
        X_train, y_train,
        eval_set=(X_test, y_test),
        early_stopping_rounds=50,
        verbose=100,
    )

    # Evaluation
    proba_test = final_model.predict_proba(X_test)
    pred_test  = np.argmax(proba_test, axis=1)

    metrics = {
        "log_loss":    round(log_loss(y_test, proba_test), 4),
        "accuracy":    round(accuracy_score(y_test, pred_test), 4),
        "f1_macro":    round(f1_score(y_test, pred_test, average="macro"), 4),
        "brier_home":  round(brier_score_loss((y_test == 1).astype(int), proba_test[:, 1]), 4),
        "train_size":  len(X_train),
        "test_size":   len(X_test),
        "label_dist":  {str(k): int(v) for k, v in zip(*np.unique(y_test, return_counts=True))},
        "feature_set": FEATURE_SET_ID,
        "n_features":  len(V4_FEATURE_COLUMNS),
    }

    logger.info("=" * 60)
    logger.info(f"log_loss : {metrics['log_loss']}")
    logger.info(f"accuracy : {metrics['accuracy']}")
    logger.info(f"f1_macro : {metrics['f1_macro']}")
    logger.info("=" * 60)

    return {"model": final_model, "metrics": metrics}


# ---------------------------------------------------------------------------
# Importance extraction
# ---------------------------------------------------------------------------

def extract_importance(model: CatBoostClassifier) -> list[dict]:
    importances = model.get_feature_importance()
    feature_names = model.feature_names_
    pairs = sorted(
        zip(feature_names, importances),
        key=lambda x: x[1],
        reverse=True,
    )
    return [{"feature": name, "importance": round(float(val), 6)} for name, val in pairs]


# ---------------------------------------------------------------------------
# Registry update
# ---------------------------------------------------------------------------

def register_model(metrics: dict, model_path: str) -> None:
    """Upsert model into v4.ml_model_registry."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO v4.ml_model_registry
                (name, version, path, is_active, metrics_json, trained_at, training_size)
            VALUES (%s, %s, %s, TRUE, %s::jsonb, NOW(), %s)
            ON CONFLICT (name) DO UPDATE
                SET version      = EXCLUDED.version,
                    path         = EXCLUDED.path,
                    is_active    = TRUE,
                    metrics_json = EXCLUDED.metrics_json,
                    trained_at   = NOW(),
                    training_size = EXCLUDED.training_size
            """,
            (
                "v4_global_1x2",
                "1.0",
                model_path,
                json.dumps(metrics),
                metrics.get("train_size", 0),
            ),
        )
        conn.commit()
        cur.close()
        logger.info("Model registered in v4.ml_model_registry")
    except Exception as exc:
        logger.warning(f"Could not register model (table may not exist yet): {exc}")
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Train V4 1X2 CatBoost classifier")
    parser.add_argument("--trials",       type=int,  default=30,    help="Optuna trials (default: 30)")
    parser.add_argument("--min-history",  type=int,  default=5,     help="Min club match history filter")
    parser.add_argument("--no-tune",      action="store_true",      help="Skip Optuna, use default params")
    args = parser.parse_args()

    os.makedirs(MODEL_DIR, exist_ok=True)

    df = load_dataset(min_history=args.min_history)
    result = train(df, n_trials=args.trials, no_tune=args.no_tune)

    model   = result["model"]
    metrics = result["metrics"]

    # Save model
    joblib.dump(model, MODEL_PATH)
    logger.info(f"Model saved to {MODEL_PATH}")

    # Save importance
    importance = extract_importance(model)
    with open(IMPORTANCE_PATH, "w") as f:
        json.dump(importance, f, indent=2)
    logger.info(f"Importance saved to {IMPORTANCE_PATH} ({len(importance)} features)")

    # Save metrics
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    # Register in DB
    register_model(metrics, MODEL_PATH)

    logger.info("Done.")
    return metrics


if __name__ == "__main__":
    main()
