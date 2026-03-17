import argparse
import json
import os
from datetime import datetime

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor, Pool
from sklearn.metrics import mean_squared_error

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, GLOBAL_1X2_FEATURE_SCHEMA_VERSION, normalize_feature_vector
from src.models.model_utils import get_valid_cat_features


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEAGUE_MODEL_ROOT = os.path.join(BASE_DIR, "models", "league_corners_ou")


def get_connection_db():
    return get_connection()


def get_league_model_dir(league_id: int):
    return os.path.join(LEAGUE_MODEL_ROOT, f"league_{league_id}")


def get_league_model_paths(league_id: int):
    model_dir = get_league_model_dir(league_id)
    return {
        "dir": model_dir,
        "home": os.path.join(model_dir, "home_corners.cbm"),
        "away": os.path.join(model_dir, "away_corners.cbm"),
        "importance": os.path.join(model_dir, "importance.json"),
        "metadata": os.path.join(model_dir, "metadata.json"),
    }


def fetch_corners_league_dataset(league_id: int):
    conn = get_connection_db()
    try:
        query = """
            SELECT
                f.fixture_id,
                f.league_id,
                l.name AS league_name,
                f.date AS match_date,
                fs_home.corner_kicks AS target_home_corners,
                fs_away.corner_kicks AS target_away_corners,
                feature_store.feature_vector
            FROM V3_Fixtures f
            JOIN V3_Fixture_Stats fs_home
              ON f.fixture_id = fs_home.fixture_id
             AND f.home_team_id = fs_home.team_id
             AND fs_home.half = 'FT'
            JOIN V3_Fixture_Stats fs_away
              ON f.fixture_id = fs_away.fixture_id
             AND f.away_team_id = fs_away.team_id
             AND fs_away.half = 'FT'
            JOIN V3_ML_Feature_Store feature_store
              ON f.fixture_id = feature_store.fixture_id
            LEFT JOIN V3_Leagues l ON f.league_id = l.league_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND f.league_id = %s
              AND fs_home.corner_kicks IS NOT NULL
              AND fs_away.corner_kicks IS NOT NULL
            ORDER BY f.date ASC
        """
        df = pd.read_sql_query(query, conn, params=(league_id,))
    finally:
        conn.close()

    if df.empty:
        raise RuntimeError(f"No corners fixtures found for league {league_id}")

    raw_features = df["feature_vector"].apply(json.loads).tolist()
    feature_frame = pd.DataFrame(
        [normalize_feature_vector(vector) for vector in raw_features],
        columns=GLOBAL_1X2_FEATURE_COLUMNS,
    )
    df = pd.concat([df.drop(columns=["feature_vector"]), feature_frame], axis=1)
    df["match_date"] = pd.to_datetime(df["match_date"], utc=True)
    return df


def train_poisson_model(X_train, y_train, X_test, y_test, cat_features):
    valid_cat_features = get_valid_cat_features(X_train.columns, cat_features)
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
    train_pool = Pool(X_train, y_train, cat_features=valid_cat_features)
    test_pool = Pool(X_test, y_test, cat_features=valid_cat_features)
    model.fit(train_pool, eval_set=test_pool, use_best_model=True)
    preds = np.maximum(model.predict(X_test), 0.01)
    return model, preds


def train_league_corners_model(league_id: int):
    df = fetch_corners_league_dataset(league_id).sort_values("match_date")
    league_name = str(df.iloc[0]["league_name"])
    paths = get_league_model_paths(league_id)
    os.makedirs(paths["dir"], exist_ok=True)

    split_idx = int(len(df) * 0.8)
    features = list(GLOBAL_1X2_FEATURE_COLUMNS)
    cat_features = ["league_id"] if "league_id" in features else []
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    X_train = train_df[features]
    X_test = test_df[features]
    y_train_h = train_df["target_home_corners"]
    y_test_h = test_df["target_home_corners"]
    y_train_a = train_df["target_away_corners"]
    y_test_a = test_df["target_away_corners"]

    home_model, preds_home = train_poisson_model(X_train, y_train_h, X_test, y_test_h, cat_features)
    away_model, preds_away = train_poisson_model(X_train, y_train_a, X_test, y_test_a, cat_features)

    total_actual = y_test_h + y_test_a
    total_pred = preds_home + preds_away
    total_rmse = float(np.sqrt(mean_squared_error(total_actual, total_pred)))
    over95_acc = float(np.mean(((total_pred > 9.5).astype(int)) == ((total_actual > 9.5).astype(int))))

    importance = pd.DataFrame(
        {
            "feature": features,
            "importance_home": home_model.get_feature_importance(),
            "importance_away": away_model.get_feature_importance(),
        }
    )
    importance["importance_mean"] = (importance["importance_home"] + importance["importance_away"]) / 2
    importance = importance.sort_values("importance_mean", ascending=False)

    home_model.save_model(paths["home"])
    away_model.save_model(paths["away"])

    metadata = {
        "market": "CORNERS_OU",
        "scope": "league_specific",
        "league_id": int(league_id),
        "league_name": league_name,
        "schema_version": GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
        "dataset_size": int(len(df)),
        "train_size": int(len(train_df)),
        "test_size": int(len(test_df)),
        "total_rmse": total_rmse,
        "over_9_5_accuracy": over95_acc,
        "features_count": len(features),
        "features_list": features,
        "model_paths": {"home": paths["home"], "away": paths["away"]},
        "importance_path": paths["importance"],
    }

    with open(paths["metadata"], "w") as handle:
        json.dump(metadata, handle, indent=2)
    with open(paths["importance"], "w") as handle:
        json.dump(importance.to_dict("records"), handle)

    conn = get_connection_db()
    try:
        version_tag = f"league_corners_v{league_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE V3_Model_Registry SET is_active = 0 WHERE name = %s AND type = %s",
                (f"league_corners_ou_{league_id}", "METAMODEL"),
            )
            cur.execute(
                """
                INSERT INTO V3_Model_Registry (name, version, type, path, is_active, metadata_json)
                VALUES (%s, %s, %s, %s, 1, %s)
                """,
                (
                    f"league_corners_ou_{league_id}",
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
        "metrics": {"total_rmse": total_rmse, "over_9_5_accuracy": over95_acc},
        "model_dir": paths["dir"],
    }, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--league-id", type=int, required=True)
    args = parser.parse_args()
    train_league_corners_model(args.league_id)
