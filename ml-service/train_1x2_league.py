import argparse
import json
import os
from datetime import datetime
from typing import Optional

import joblib
import numpy as np
import optuna
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.metrics import accuracy_score, f1_score, log_loss
from sklearn.model_selection import TimeSeriesSplit

from db_config import get_connection
from feature_schema import (
    GLOBAL_1X2_FEATURE_COLUMNS,
    GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
    inspect_feature_vector,
    normalize_feature_vector,
)
from horizon_utils import filter_dataframe_by_horizon, normalize_horizon_type


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEAGUE_MODEL_ROOT = os.path.join(BASE_DIR, "models", "league_1x2")


def get_db_connection():
    return get_connection()


def get_league_model_dir(league_id: int):
    return os.path.join(LEAGUE_MODEL_ROOT, f"league_{league_id}")


def get_league_model_paths(league_id: int, horizon_slug: Optional[str] = None):
    model_dir = get_league_model_dir(league_id)
    suffix = f"_{horizon_slug}" if horizon_slug else ""
    return {
        "dir": model_dir,
        "model": os.path.join(model_dir, f"model_1x2{suffix}.joblib"),
        "importance": os.path.join(model_dir, f"model_1x2{suffix}_importance.json"),
        "metadata": os.path.join(model_dir, f"model_1x2{suffix}_metadata.json"),
    }


def objective(trial, X, y):
    params = {
        "iterations": trial.suggest_int("iterations", 150, 800),
        "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.1, log=True),
        "depth": trial.suggest_int("depth", 4, 8),
        "l2_leaf_reg": trial.suggest_float("l2_leaf_reg", 1e-2, 10.0, log=True),
        "bootstrap_type": trial.suggest_categorical("bootstrap_type", ["Bayesian", "Bernoulli", "MVS"]),
        "random_strength": trial.suggest_float("random_strength", 1e-9, 10, log=True),
        "od_type": "Iter",
        "od_wait": 50,
        "verbose": False,
        "random_seed": 42,
    }
    if params["bootstrap_type"] == "Bernoulli":
        params["subsample"] = trial.suggest_float("subsample", 0.5, 1.0)

    tscv = TimeSeriesSplit(n_splits=3)
    scores = []
    for train_index, val_index in tscv.split(X):
        X_train, X_val = X.iloc[train_index], X.iloc[val_index]
        y_train, y_val = y.iloc[train_index], y.iloc[val_index]
        model = CatBoostClassifier(**params)
        model.fit(X_train, y_train, eval_set=(X_val, y_val), use_best_model=True)
        preds = model.predict_proba(X_val)
        scores.append(log_loss(y_val, preds))
    return float(np.mean(scores))


def fetch_league_dataset(league_id: int):
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
                fs.feature_vector
            FROM V3_Fixtures f
            JOIN V3_ML_Feature_Store fs ON f.fixture_id = fs.fixture_id
            LEFT JOIN V3_Leagues l ON f.league_id = l.league_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND f.league_id = %s
            ORDER BY f.date ASC
        """
        df = pd.read_sql_query(query, conn, params=(league_id,))
    finally:
        conn.close()

    if df.empty:
        raise RuntimeError(f"No fixtures found for league {league_id}")

    raw_features = df["feature_vector"].apply(json.loads).tolist()
    schema_issues = [inspect_feature_vector(vector) for vector in raw_features]
    if any(issue["missing"] or issue["extra"] for issue in schema_issues):
        first_issue = next(issue for issue in schema_issues if issue["missing"] or issue["extra"])
        raise ValueError(
            "Feature schema mismatch detected in V3_ML_Feature_Store "
            f"for {GLOBAL_1X2_FEATURE_SCHEMA_VERSION}: "
            f"missing={first_issue['missing'][:5]} extra={first_issue['extra'][:5]}"
        )

    X = pd.DataFrame(
        [normalize_feature_vector(vector) for vector in raw_features],
        columns=GLOBAL_1X2_FEATURE_COLUMNS,
    )
    y = np.where(df["goals_home"] > df["goals_away"], 1, np.where(df["goals_home"] < df["goals_away"], 2, 0))
    return df, X, pd.Series(y)


def train_league_model(
    league_id: int,
    use_optuna: bool = True,
    n_trials: int = 10,
    horizon_type: str = "FULL_HISTORICAL",
    activate: bool = True,
):
    horizon_type = normalize_horizon_type(horizon_type)
    horizon_slug = horizon_type.lower()
    df, X, y = fetch_league_dataset(league_id)
    df, horizon_window = filter_dataframe_by_horizon(df, "match_date", horizon_type)
    X = X.loc[df.index].reset_index(drop=True)
    y = y.loc[df.index].reset_index(drop=True)
    df = df.reset_index(drop=True)
    league_name = str(df.iloc[0]["league_name"])
    paths = get_league_model_paths(league_id, horizon_slug)
    os.makedirs(paths["dir"], exist_ok=True)

    best_params = {
        "iterations": 500,
        "learning_rate": 0.03,
        "depth": 6,
        "l2_leaf_reg": 3,
        "verbose": False,
        "random_seed": 42,
    }
    if use_optuna and len(X) > 1000:
        study = optuna.create_study(direction="minimize")
        study.optimize(lambda trial: objective(trial, X, y), n_trials=n_trials)
        best_params.update(study.best_params)

    split_idx = int(len(X) * 0.85)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    model = CatBoostClassifier(**best_params)
    model.fit(X_train, y_train, eval_set=(X_test, y_test), use_best_model=True)
    probs = model.predict_proba(X_test)
    preds = model.predict(X_test)

    accuracy = float(accuracy_score(y_test, preds))
    loss = float(log_loss(y_test, probs))
    f1 = float(f1_score(y_test, preds, average="weighted"))
    y_one_hot = pd.get_dummies(y_test).reindex(columns=[0, 1, 2], fill_value=0).values
    brier = float(np.mean(np.sum((probs - y_one_hot) ** 2, axis=1)))

    joblib.dump(model, paths["model"])
    importance = pd.DataFrame(
        {"feature": X.columns, "importance": model.get_feature_importance()}
    ).sort_values("importance", ascending=False)
    with open(paths["importance"], "w") as handle:
        json.dump(importance.to_dict("records"), handle)

    metadata = {
        "scope": "league_specific",
        "market": "1N2_FT",
        "horizon": horizon_type,
        "league_id": int(league_id),
        "league_name": league_name,
        "schema_version": GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
        "hyperparameters": best_params,
        "training_dataset_size": int(len(X_train)),
        "test_dataset_size": int(len(X_test)),
        "features_count": int(len(X.columns)),
        "metrics": {
            "accuracy": accuracy,
            "log_loss": loss,
            "brier_score": brier,
            "f1_weighted": f1,
        },
        "activate": bool(activate),
        "horizon_min_date": horizon_window.min_date_included.isoformat() if horizon_window.min_date_included is not None else None,
        "horizon_max_date": horizon_window.max_date.isoformat() if str(horizon_window.max_date) != "NaT" else None,
        "features_list": list(X.columns),
    }
    with open(paths["metadata"], "w") as handle:
        json.dump(metadata, handle, indent=2)

    conn = get_db_connection()
    try:
        version_tag = f"league_catboost_v{league_id}_{horizon_slug}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        with conn.cursor() as cur:
            if activate:
                cur.execute(
                    """
                    UPDATE V3_Model_Registry
                    SET is_active = 0
                    WHERE name = %s AND type = %s
                    """,
                    (f"league_1x2_ft_{league_id}", "METAMODEL"),
                )
            cur.execute(
                """
                INSERT INTO V3_Model_Registry (
                    name, version, type, path, is_active, metadata_json
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    f"league_1x2_ft_{league_id}",
                    version_tag,
                    "METAMODEL",
                    paths["model"],
                    1 if activate else 0,
                    json.dumps(metadata),
                ),
            )
        conn.commit()
    finally:
        conn.close()

    print(
        json.dumps(
            {
                "league_id": league_id,
                "league_name": league_name,
                "version": version_tag,
                "metrics": metadata["metrics"],
                "model_path": paths["model"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--league-id", type=int, required=True)
    parser.add_argument("--no-optuna", action="store_true")
    parser.add_argument("--trials", type=int, default=10)
    parser.add_argument("--horizon", default="FULL_HISTORICAL", choices=["FULL_HISTORICAL", "5Y_ROLLING", "3Y_ROLLING"])
    parser.add_argument("--no-activate", action="store_true")
    args = parser.parse_args()
    train_league_model(
        args.league_id,
        use_optuna=not args.no_optuna,
        n_trials=args.trials,
        horizon_type=args.horizon,
        activate=not args.no_activate,
    )
