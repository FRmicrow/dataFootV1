import argparse
import json
import os
from datetime import datetime

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor, Pool
from sklearn.metrics import log_loss, mean_poisson_deviance, mean_squared_error

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, GLOBAL_1X2_FEATURE_SCHEMA_VERSION
from src.models.ht_result.dataset import fetch_ht_dataset_v2
from src.models.model_utils import poisson_prob


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEAGUE_MODEL_ROOT = os.path.join(BASE_DIR, "models", "league_ht_1x2")


def get_league_model_dir(league_id: int):
    return os.path.join(LEAGUE_MODEL_ROOT, f"league_{league_id}")


def get_league_model_paths(league_id: int):
    model_dir = get_league_model_dir(league_id)
    return {
        "dir": model_dir,
        "home": os.path.join(model_dir, "catboost_ht_home.cbm"),
        "away": os.path.join(model_dir, "catboost_ht_away.cbm"),
        "metadata": os.path.join(model_dir, "model_ht_metadata.json"),
    }


def get_db_connection():
    return get_connection()


def train_poisson_model(X_train, y_train, X_test, y_test, label):
    model = CatBoostRegressor(
        loss_function="Poisson",
        iterations=1000,
        learning_rate=0.03,
        depth=6,
        eval_metric="Poisson",
        random_seed=42,
        od_type="Iter",
        od_wait=50,
        verbose=False,
    )

    train_pool = Pool(X_train, y_train)
    test_pool = Pool(X_test, y_test)
    model.fit(train_pool, eval_set=test_pool, use_best_model=True)

    preds = np.maximum(model.predict(X_test), 0.01)
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    deviance = float(mean_poisson_deviance(y_test, preds))
    return model, preds, rmse, deviance


def calculate_1n2_probs(home_mu, away_mu, max_goals=5):
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


def train_league_model(league_id: int):
    df = fetch_ht_dataset_v2()
    df = df[df["league_id"] == league_id].sort_values("match_date")
    if df.empty:
        raise RuntimeError(f"No HT fixtures found for league {league_id}")

    paths = get_league_model_paths(league_id)
    os.makedirs(paths["dir"], exist_ok=True)
    features = list(GLOBAL_1X2_FEATURE_COLUMNS)

    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    X_train = train_df[features]
    X_test = test_df[features]
    y_train_h = train_df["target_ht_home_goals"]
    y_test_h = test_df["target_ht_home_goals"]
    y_train_a = train_df["target_ht_away_goals"]
    y_test_a = test_df["target_ht_away_goals"]

    home_model, preds_home, rmse_home, dev_home = train_poisson_model(X_train, y_train_h, X_test, y_test_h, "Home HT Goals")
    away_model, preds_away, rmse_away, dev_away = train_poisson_model(X_train, y_train_a, X_test, y_test_a, "Away HT Goals")

    y_true = np.where(y_test_h > y_test_a, 0, np.where(y_test_h == y_test_a, 1, 2))
    probs = np.array([calculate_1n2_probs(h, a) for h, a in zip(preds_home, preds_away)])
    preds = np.argmax(probs, axis=1)
    acc = float(np.mean(preds == y_true))
    ll = float(log_loss(y_true, probs))

    home_model.save_model(paths["home"])
    away_model.save_model(paths["away"])

    league_name = str(df.iloc[0].get("league_name", f"league_{league_id}"))
    metadata = {
        "scope": "league_specific",
        "market": "1N2_HT",
        "league_id": int(league_id),
        "league_name": league_name,
        "schema_version": GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
        "dataset_size": int(len(df)),
        "train_size": int(len(train_df)),
        "test_size": int(len(test_df)),
        "features_count": len(features),
        "metrics": {
            "accuracy": acc,
            "log_loss": ll,
            "home_rmse": rmse_home,
            "away_rmse": rmse_away,
            "home_deviance": dev_home,
            "away_deviance": dev_away,
        },
        "model_paths": {
            "home": paths["home"],
            "away": paths["away"],
        },
        "features_list": features,
    }
    with open(paths["metadata"], "w") as handle:
        json.dump(metadata, handle, indent=2)

    conn = get_db_connection()
    try:
        version_tag = f"league_ht_v{league_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE V3_Model_Registry
                SET is_active = 0
                WHERE name = %s AND type = %s
                """,
                (f"league_ht_1x2_{league_id}", "METAMODEL"),
            )
            cur.execute(
                """
                INSERT INTO V3_Model_Registry (
                    name, version, type, path, is_active, metadata_json
                ) VALUES (%s, %s, %s, %s, 1, %s)
                """,
                (
                    f"league_ht_1x2_{league_id}",
                    version_tag,
                    "METAMODEL",
                    paths["dir"],
                    json.dumps(metadata),
                ),
            )
        conn.commit()
    finally:
        conn.close()

    print(json.dumps({
        "league_id": league_id,
        "league_name": league_name,
        "version": version_tag,
        "metrics": metadata["metrics"],
        "model_paths": metadata["model_paths"],
    }, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--league-id", type=int, required=True)
    args = parser.parse_args()
    train_league_model(args.league_id)
