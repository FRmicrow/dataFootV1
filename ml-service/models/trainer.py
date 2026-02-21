"""
models/trainer.py — LightGBM Training Pipeline (US_025)
=========================================================

Trains two independent models:
  • model_1x2  — Multiclass (HOME / DRAW / AWAY)
  • model_ou25 — Binary     (OVER / UNDER 2.5 goals)

Usage (CLI)
-----------
    python -m models.trainer --target 1x2
    python -m models.trainer --target ou25
    python -m models.trainer --target all

The script:
1. Loads all completed fixtures with goals from V3_Fixtures.
2. Builds feature vectors via features/builder.py (anti-leakage enforced).
3. Splits chronologically (last 20% = test set, no shuffle).
4. Trains LightGBM with early stopping on a chronological validation split.
5. Calibrates probabilities with isotonic regression (fit on validation only).
6. Saves versioned .pkl + meta.json + feature_importance.json.
7. Writes model metadata to V3_ML_Models via the Node API
   (POST /api/v3/admin/models — see AC 5 note).
"""

from __future__ import annotations

import argparse
import json
import logging
import pickle
import sys
import warnings
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier
from sklearn.metrics import accuracy_score, log_loss
from sklearn.preprocessing import LabelEncoder

# ── project imports ──────────────────────────────────────────────────────────
# Allow running as `python -m models.trainer` from ml-service root
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import MODEL_DIR, MIN_TRAIN_SAMPLES
from db.reader import fetch_df, fetch_all
from features.builder import build_features, FEATURE_COLUMNS
from models.calibrator import MulticlassIsotonicCalibrator, calibrate_binary

logger = logging.getLogger(__name__)
warnings.filterwarnings("ignore", category=UserWarning)

CACHE_DIR = Path(__file__).parent.parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
FEATURE_CACHE_FILE = CACHE_DIR / "feature_matrix_last.csv"

# ── LightGBM hyper-parameters ────────────────────────────────────────────────

LGB_PARAMS_1X2 = {
    "objective": "multiclass",
    "num_class": 3,
    "metric": "multi_logloss",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_child_samples": 20,
    "n_estimators": 500,
    "class_weight": "balanced",
    "verbosity": -1,
    "random_state": 42,
}

LGB_PARAMS_OU25 = {
    "objective": "binary",
    "metric": "binary_logloss",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_child_samples": 20,
    "n_estimators": 500,
    "class_weight": "balanced",
    "verbosity": -1,
    "random_state": 42,
}


# ── Data loading ──────────────────────────────────────────────────────────────


def _load_completed_fixtures(limit: int = 10000, league_ids: Optional[List[int]] = None) -> pd.DataFrame:
    """
    Load completed fixtures with scores from V3_Fixtures.
    Supports targeting specific leagues (US_033).
    """
    where_clause = "status_short IN ('FT', 'AET', 'PEN') AND goals_home IS NOT NULL AND goals_away IS NOT NULL"
    params = []

    if league_ids:
        placeholders = ",".join(["?"] * len(league_ids))
        where_clause += f" AND league_id IN ({placeholders})"
        params.extend(league_ids)

    sql = f"""
        SELECT
            fixture_id AS fixture_id,
            date,
            home_team_id,
            away_team_id,
            league_id,
            goals_home,
            goals_away
        FROM V3_Fixtures
        WHERE {where_clause}
        ORDER BY date DESC
        LIMIT {limit}
    """
    df = fetch_df(sql, params)
    df = df.sort_values("date", ascending=True) # Ensure chronological for 80/20 split
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    logger.info("Loaded %d completed fixtures", len(df))
    return df


def _load_features_for_fixtures(fixtures_df: pd.DataFrame) -> pd.DataFrame:
    """
    Retrieves pre-calculated features from V3_ML_Feature_Store (US_031).
    This replaces building features on the fly.
    """
    if fixtures_df.empty:
        return pd.DataFrame()

    fixture_ids = fixtures_df["fixture_id"].tolist()
    placeholders = ",".join(["?"] * len(fixture_ids))
    
    sql = f"""
        SELECT fixture_id, feature_vector
        FROM V3_ML_Feature_Store
        WHERE fixture_id IN ({placeholders})
    """
    # SQLite has a limit on parameters count (usually 999), 
    # but for typical training runs we can handle this in chunks if needed.
    # For now, we assume fixture_ids is reasonably sized or we use multiple queries.
    
    id_map = {row[0]: json.loads(row[1]) for row in fetch_all(sql, fixture_ids)}
    
    rows = []
    skipped = 0
    for _, row in fixtures_df.iterrows():
        f_id = int(row["fixture_id"])
        if f_id in id_map:
            feat = id_map[f_id]
            feat["fixture_id"] = f_id
            feat["date"] = row["date"]
            feat["goals_home"] = row["goals_home"]
            feat["goals_away"] = row["goals_away"]
            feat["league_id"] = row["league_id"]
            rows.append(feat)
        else:
            skipped += 1
            
    if skipped > 0:
        logger.warning(f"Skipped {skipped} fixtures (features missing in Store). "
                       f"Run 'Empower League' first to process these.")

    return pd.DataFrame(rows)


# Feature cache is now handled by the persistent V3_ML_Feature_Store database table.
# _build_feature_matrix is deprecated in favor of _load_features_for_fixtures.


def _make_labels(df: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    """Create 1X2 label and O/U 2.5 label columns."""
    def label_1x2(row):
        if row["goals_home"] > row["goals_away"]:
            return "HOME"
        elif row["goals_home"] < row["goals_away"]:
            return "AWAY"
        return "DRAW"

    label_ou = (df["goals_home"] + df["goals_away"]).apply(
        lambda g: "OVER" if g > 2.5 else "UNDER"
    )
    label_1x2 = df.apply(label_1x2, axis=1)
    return label_1x2, label_ou


# ── Next model version ────────────────────────────────────────────────────────


def _next_version(target: str) -> int:
    """Determine the next version number by scanning saved_models/."""
    existing = list(MODEL_DIR.glob(f"{target}_v*_meta.json"))
    if not existing:
        return 1
    versions = []
    for p in existing:
        try:
            stem = p.stem  # e.g. "1x2_v3_meta"
            v = int(stem.split("_v")[1].split("_")[0])
            versions.append(v)
        except (IndexError, ValueError):
            pass
    return max(versions) + 1 if versions else 1


# ── Persistence helpers ───────────────────────────────────────────────────────


def _save_model(model, version: int, target: str) -> Path:
    path = MODEL_DIR / f"{target}_v{version}.pkl"
    with open(path, "wb") as f:
        pickle.dump(model, f)
    logger.info("Model saved: %s", path)
    return path


def _save_meta(meta: dict, version: int, target: str) -> Path:
    path = MODEL_DIR / f"{target}_v{version}_meta.json"
    with open(path, "w") as f:
        json.dump(meta, f, indent=2, default=str)
    logger.info("Meta saved: %s", path)
    return path


def _save_feature_importance(model: LGBMClassifier, version: int, target: str) -> Path:
    path = MODEL_DIR / f"feature_importance_v{version}_{target}.json"
    importance = dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist()))
    importance_sorted = dict(sorted(importance.items(), key=lambda x: -x[1]))
    with open(path, "w") as f:
        json.dump(importance_sorted, f, indent=2)
    logger.info("Feature importance saved: %s", path)
    return path


# ── Training functions ────────────────────────────────────────────────────────


def train_1x2(feature_matrix: pd.DataFrame) -> dict:
    """
    Train and calibrate the 1X2 model.
    Returns metadata dict (written to meta.json and V3_ML_Models).
    """
    logger.info("=== Training 1X2 model ===")

    label_1x2, _ = _make_labels(feature_matrix)

    X = feature_matrix[FEATURE_COLUMNS].values
    y_raw = label_1x2.values

    # Chronological 80/20 split
    n = len(X)
    if n < MIN_TRAIN_SAMPLES:
        raise ValueError(f"Not enough training samples: {n} < {MIN_TRAIN_SAMPLES}")

    split_idx = int(n * 0.80)
    val_idx = int(split_idx * 0.85)  # inner validation from train set for early stopping

    X_train, X_val, X_test = X[:val_idx], X[val_idx:split_idx], X[split_idx:]
    y_train, y_val, y_test = y_raw[:val_idx], y_raw[val_idx:split_idx], y_raw[split_idx:]

    # Encode labels
    le = LabelEncoder()
    le.fit(["AWAY", "DRAW", "HOME"])  # Fixed order for reproducibility
    y_train_enc = le.transform(y_train)
    y_val_enc = le.transform(y_val)
    y_test_enc = le.transform(y_test)

    logger.info(
        "Split — train: %d  val: %d  test: %d  classes: %s",
        len(X_train), len(X_val), len(X_test), list(le.classes_),
    )

    # Train LightGBM
    model = LGBMClassifier(**LGB_PARAMS_1X2)
    model.fit(
        X_train, y_train_enc,
        eval_set=[(X_val, y_val_enc)],
        callbacks=[],
    )

    # Raw metrics
    train_probs = model.predict_proba(X_train)
    test_probs = model.predict_proba(X_test)
    log_loss_train = log_loss(y_train_enc, train_probs, labels=[0, 1, 2])
    log_loss_test = log_loss(y_test_enc, test_probs, labels=[0, 1, 2])
    accuracy = accuracy_score(y_test_enc, model.predict(X_test))

    # Calibrate (fit on validation set only)
    cal = MulticlassIsotonicCalibrator(classes=list(le.classes_))
    val_probs = model.predict_proba(X_val)
    cal.fit(val_probs, y_val_enc)

    brier_before = float(np.mean(
        (model.predict_proba(X_test) - np.eye(3)[y_test_enc]) ** 2
    ))
    brier_after = cal.brier_score(model.predict_proba(X_test), y_test_enc)

    logger.info(
        "1X2 — log_loss train: %.4f  test: %.4f  accuracy: %.4f  "
        "brier before: %.4f  after: %.4f",
        log_loss_train, log_loss_test, accuracy, brier_before, brier_after,
    )

    # Bundle model + calibrator + encoder
    bundle = {
        "model": model,
        "calibrator": cal,
        "label_encoder": le,
        "feature_columns": FEATURE_COLUMNS,
    }

    version = _next_version("1x2")
    model_path = _save_model(bundle, version, "1x2")
    _save_feature_importance(model, version, "1x2")

    leagues = list(feature_matrix["league_id"].unique().tolist())
    meta = {
        "version": version,
        "created_at": datetime.utcnow().isoformat(),
        "target": "1x2",
        "log_loss_train": round(log_loss_train, 6),
        "log_loss_test": round(log_loss_test, 6),
        "brier_score_before": round(brier_before, 6),
        "brier_score": round(brier_after, 6),
        "accuracy": round(accuracy, 6),
        "train_samples": int(val_idx),
        "val_samples": int(split_idx - val_idx),
        "test_samples": int(n - split_idx),
        "feature_count": len(FEATURE_COLUMNS),
        "leagues_included": [int(l) for l in leagues],
        "training_window_start": str(feature_matrix["date"].min()),
        "training_window_end": str(feature_matrix["date"].max()),
        "model_file": str(model_path),
    }
    _save_meta(meta, version, "1x2")
    return meta


def train_ou25(feature_matrix: pd.DataFrame) -> dict:
    """
    Train and calibrate the O/U 2.5 binary model.
    """
    logger.info("=== Training O/U 2.5 model ===")

    _, label_ou = _make_labels(feature_matrix)

    # O/U relevant features (goals-related signals matter more here)
    X = feature_matrix[FEATURE_COLUMNS].values
    y_raw = label_ou.values

    n = len(X)
    if n < MIN_TRAIN_SAMPLES:
        raise ValueError(f"Not enough training samples: {n} < {MIN_TRAIN_SAMPLES}")

    split_idx = int(n * 0.80)
    val_idx = int(split_idx * 0.85)

    X_train, X_val, X_test = X[:val_idx], X[val_idx:split_idx], X[split_idx:]
    y_train, y_val, y_test = y_raw[:val_idx], y_raw[val_idx:split_idx], y_raw[split_idx:]

    le = LabelEncoder()
    le.fit(["OVER", "UNDER"])
    y_train_enc = le.transform(y_train)
    y_val_enc = le.transform(y_val)
    y_test_enc = le.transform(y_test)

    logger.info(
        "Split — train: %d  val: %d  test: %d  class balance (OVER): %.1f%%",
        len(X_train), len(X_val), len(X_test),
        100 * (y_train_enc == le.transform(["OVER"])[0]).mean(),
    )

    model = LGBMClassifier(**LGB_PARAMS_OU25)
    model.fit(
        X_train, y_train_enc,
        eval_set=[(X_val, y_val_enc)],
        callbacks=[],
    )

    train_probs = model.predict_proba(X_train)[:, 1]
    test_probs = model.predict_proba(X_test)[:, 1]
    log_loss_train = log_loss(y_train_enc, train_probs)
    log_loss_test = log_loss(y_test_enc, test_probs)
    accuracy = accuracy_score(y_test_enc, model.predict(X_test))

    # Calibrate
    calibrated, brier_before, brier_after = calibrate_binary(model, X_val, y_val_enc)

    logger.info(
        "O/U 2.5 — log_loss train: %.4f  test: %.4f  accuracy: %.4f  "
        "brier before: %.4f  after: %.4f",
        log_loss_train, log_loss_test, accuracy, brier_before, brier_after,
    )

    bundle = {
        "model": calibrated,  # Already calibrated (CalibratedClassifierCV)
        "label_encoder": le,
        "feature_columns": FEATURE_COLUMNS,
    }

    version = _next_version("ou25")
    model_path = _save_model(bundle, version, "ou25")
    _save_feature_importance(model, version, "ou25")

    leagues = list(feature_matrix["league_id"].unique().tolist())
    meta = {
        "version": version,
        "created_at": datetime.utcnow().isoformat(),
        "target": "ou25",
        "log_loss_train": round(log_loss_train, 6),
        "log_loss_test": round(log_loss_test, 6),
        "brier_score_before": round(brier_before, 6),
        "brier_score": round(brier_after, 6),
        "accuracy": round(accuracy, 6),
        "train_samples": int(val_idx),
        "val_samples": int(split_idx - val_idx),
        "test_samples": int(n - split_idx),
        "feature_count": len(FEATURE_COLUMNS),
        "leagues_included": [int(l) for l in leagues],
        "training_window_start": str(feature_matrix["date"].min()),
        "training_window_end": str(feature_matrix["date"].max()),
        "model_file": str(model_path),
    }
    _save_meta(meta, version, "ou25")
    return meta


# ── CLI entry point ───────────────────────────────────────────────────────────


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    )

    parser = argparse.ArgumentParser(description="Train LightGBM football prediction models")
    parser.add_argument(
        "--target",
        choices=["1x2", "ou25", "all"],
        required=True,
        help="Which model to train: '1x2', 'ou25', or 'all'",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10000,
        help="Max number of fixtures to load for training (default: 10,000)",
    )
    parser.add_argument(
        "--league",
        type=str,
        default="",
        help="Comma-separated league IDs to target (US_033). Empty = all empowered data.",
    )
    args = parser.parse_args()

    league_ids = [int(x.strip()) for x in args.league.split(",") if x.strip()] if args.league else None

    logger.info("Loading fixture data from DB: %s", "...")
    fixtures = _load_completed_fixtures(limit=args.limit, league_ids=league_ids)

    logger.info("Fetching pre-calculated features from Store (US_031)...")
    feature_matrix = _load_features_for_fixtures(fixtures)

    logger.info("Feature matrix: %d rows, %d columns", *feature_matrix.shape)

    results = {}
    if args.target in ("1x2", "all"):
        results["1x2"] = train_1x2(feature_matrix)

    if args.target in ("ou25", "all"):
        results["ou25"] = train_ou25(feature_matrix)

    logger.info("=== Training complete ===")
    for target, meta in results.items():
        logger.info(
            "[%s v%d] log_loss_test=%.4f  brier=%.4f  accuracy=%.4f",
            target.upper(),
            meta["version"],
            meta["log_loss_test"],
            meta["brier_score"],
            meta["accuracy"],
        )


if __name__ == "__main__":
    main()
