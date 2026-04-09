import argparse
import json
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor, Pool
from sklearn.metrics import mean_poisson_deviance, mean_squared_error

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
ML_SERVICE_ROOT = os.path.abspath(os.path.join(MODEL_DIR, "..", "..", ".."))
if ML_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, ML_SERVICE_ROOT)

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, GLOBAL_1X2_FEATURE_SCHEMA_VERSION
from horizon_utils import filter_dataframe_by_horizon, normalize_horizon_type
from model_paths import get_cards_poisson_paths, with_horizon_suffix
from src.models.model_utils import get_valid_cat_features

from dataset import fetch_cards_dataset, fetch_cards_dataset_v2


def train_poisson_model(X_train, y_train, X_test, y_test, cat_features, label):
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
        verbose=100,
    )

    train_pool = Pool(X_train, y_train, cat_features=valid_cat_features)
    test_pool = Pool(X_test, y_test, cat_features=valid_cat_features)

    print(f"\nTraining {label} model...")
    model.fit(train_pool, eval_set=test_pool, use_best_model=True)

    preds = np.maximum(model.predict(X_test), 0.01)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    deviance = mean_poisson_deviance(y_test, preds)
    print(f"{label} Performance - RMSE: {rmse:.4f} Cards | Poisson Deviance: {deviance:.4f}")
    return model, preds


def run_training(version="v1", horizon_type="FULL_HISTORICAL", activate=True):
    horizon_type = normalize_horizon_type(horizon_type)
    horizon_slug = horizon_type.lower()
    model_paths = with_horizon_suffix(get_cards_poisson_paths(version), horizon_slug)
    os.makedirs(model_paths["dir"], exist_ok=True)

    if version == "v2":
        df = fetch_cards_dataset_v2().sort_values("match_date")
        features = list(GLOBAL_1X2_FEATURE_COLUMNS)
    else:
        df = fetch_cards_dataset().sort_values("match_date")
        features = [
            "league_id",
            "diff_elo", "diff_points", "diff_rank", "diff_lineup_strength",
            "home_b_elo", "away_b_elo", "home_b_lineup_strength_v1", "away_b_lineup_strength_v1",
            "diff_possession_l5", "diff_control_l5", "diff_fouls_l5", "diff_yellow_l5", "diff_red_l5",
            "home_p_possession_avg_5", "away_p_possession_avg_5",
            "home_p_control_index_5", "away_p_control_index_5",
            "home_p_fouls_per_match_5", "away_p_fouls_per_match_5",
            "home_p_yellow_per_match_5", "away_p_yellow_per_match_5",
            "home_p_red_per_match_5", "away_p_red_per_match_5",
        ]
    df, horizon_window = filter_dataframe_by_horizon(df, "match_date", horizon_type)

    cat_features = ["league_id"] if "league_id" in features else []
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    X_train = train_df[features]
    X_test = test_df[features]
    y_train_h = train_df["target_home_cards"]
    y_test_h = test_df["target_home_cards"]
    y_train_a = train_df["target_away_cards"]
    y_test_a = test_df["target_away_cards"]

    print(f"\nFeatures used: {len(features)} columns")
    print(f"Train size: {len(train_df)} | Test size: {len(test_df)}")

    home_model, preds_home = train_poisson_model(X_train, y_train_h, X_test, y_test_h, cat_features, "Home Cards")
    away_model, preds_away = train_poisson_model(X_train, y_train_a, X_test, y_test_a, cat_features, "Away Cards")

    total_actual = y_test_h + y_test_a
    total_pred = preds_home + preds_away
    total_rmse = np.sqrt(mean_squared_error(total_actual, total_pred))
    over45_acc = float(np.mean(((total_pred > 4.5).astype(int)) == ((total_actual > 4.5).astype(int))))

    print(f"\nTotal Cards Prediction - Overall RMSE: {total_rmse:.4f} Cards")
    print(f"Over 4.5 directional accuracy: {over45_acc:.4f}")

    importance = pd.DataFrame({
        "feature": features,
        "importance_home": home_model.get_feature_importance(),
        "importance_away": away_model.get_feature_importance(),
    })
    importance["importance_mean"] = (importance["importance_home"] + importance["importance_away"]) / 2
    importance = importance.sort_values("importance_mean", ascending=False)

    home_model.save_model(model_paths["home"])
    away_model.save_model(model_paths["away"])

    if version == "v2":
        metadata = {
            "market": "CARDS_OU",
            "scope": "global",
            "horizon": horizon_type,
            "schema_version": GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
            "dataset_size": int(len(df)),
            "train_size": int(len(train_df)),
            "test_size": int(len(test_df)),
            "total_rmse": float(total_rmse),
            "over_4_5_accuracy": over45_acc,
            "features_count": len(features),
            "model_paths": {
                "home": model_paths["home"],
                "away": model_paths["away"],
            },
            "features_list": features,
        }
        metadata_path = os.path.join(model_paths["dir"], f"catboost_cards_v2_{horizon_slug}_metadata.json")
        with open(metadata_path, "w") as handle:
            json.dump(metadata, handle, indent=2)

        importance_path = os.path.join(model_paths["dir"], f"catboost_cards_v2_{horizon_slug}_importance.json")
        with open(importance_path, "w") as handle:
            json.dump(importance.to_dict("records"), handle)

        conn = get_connection()
        try:
            version_tag = f"catboost_cards_{horizon_slug}_v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            registry_metadata = {
                **metadata,
                "importance_path": importance_path,
                "activate": bool(activate),
                "horizon_min_date": horizon_window.min_date_included.isoformat() if horizon_window.min_date_included is not None else None,
                "horizon_max_date": horizon_window.max_date.isoformat() if str(horizon_window.max_date) != "NaT" else None,
            }
            with conn.cursor() as cur:
                if activate:
                    cur.execute(
                        """
                        UPDATE V3_Model_Registry
                        SET is_active = 0
                        WHERE name = %s AND type = %s
                        """,
                        ("global_cards_ou", "METAMODEL"),
                    )
                cur.execute(
                    """
                    INSERT INTO V3_Model_Registry (
                        name, version, type, path, is_active, metadata_json
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        "global_cards_ou",
                        version_tag,
                        "METAMODEL",
                        model_paths["dir"],
                        1 if activate else 0,
                        json.dumps(registry_metadata),
                    ),
                )
            conn.commit()
            print(f"Registered CARDS_OU model as {version_tag}")
        finally:
            conn.close()

    print(f"\nModels saved to {model_paths['dir']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", type=str, default="v1", choices=["v1", "v2"])
    parser.add_argument("--horizon", default="FULL_HISTORICAL", choices=["FULL_HISTORICAL", "5Y_ROLLING", "3Y_ROLLING"])
    parser.add_argument("--no-activate", action="store_true")
    args = parser.parse_args()
    run_training(args.version, horizon_type=args.horizon, activate=not args.no_activate)
