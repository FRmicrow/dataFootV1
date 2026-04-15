"""
predictor_v4.py — V4 inference pipeline.

Replaces src/orchestrator/predictor.py for V4 matches.
Loads all V4 models, generates predictions, stores in v4.ml_predictions.

Public API:
    predict_match_v4(match_id) -> dict
    predict_matches_v4_batch(match_ids) -> list[dict]
"""

import json
import logging
import os
import time
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostRegressor

from db_config import get_connection
from features_v4_pipeline import (
    V4_FEATURE_COLUMNS,
    compute_feature_vector_v4,
    vector_from_json,
    vector_to_json,
    store_feature_vector,
)

logger = logging.getLogger(__name__)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_V4  = os.path.join(BASE_DIR, "models", "v4")

# Model paths
PATHS = {
    "1x2":     os.path.join(MODELS_V4, "global_1x2", "model_1x2.joblib"),
    "goals_h": os.path.join(MODELS_V4, "goals",      "model_goals_home.cbm"),
    "goals_a": os.path.join(MODELS_V4, "goals",      "model_goals_away.cbm"),
    "ht_h":    os.path.join(MODELS_V4, "ht_result",  "model_ht_home.cbm"),
    "ht_a":    os.path.join(MODELS_V4, "ht_result",  "model_ht_away.cbm"),
    "corners_h": os.path.join(MODELS_V4, "corners",  "model_corners_home.cbm"),
    "corners_a": os.path.join(MODELS_V4, "corners",  "model_corners_away.cbm"),
    "cards_h": os.path.join(MODELS_V4, "cards",      "model_cards_home.cbm"),
    "cards_a": os.path.join(MODELS_V4, "cards",      "model_cards_away.cbm"),
}

IMPORTANCE_PATH = os.path.join(MODELS_V4, "global_1x2", "importance.json")
FEATURE_SET_ID  = "v4_global_1x2_v2"
MODEL_NAME      = "v4_global_1x2"

# ---------------------------------------------------------------------------
# Model registry (module-level cache — loaded once)
# ---------------------------------------------------------------------------

_models: dict = {}
_importance: list = []


def _load_models() -> None:
    global _models, _importance
    for key, path in PATHS.items():
        if os.path.exists(path):
            if path.endswith(".joblib"):
                _models[key] = joblib.load(path)
            else:
                m = CatBoostRegressor()
                m.load_model(path)
                _models[key] = m
            logger.info(f"[predictor_v4] Loaded {key} from {path}")
        else:
            logger.warning(f"[predictor_v4] Model not found: {path} — predictions will be partial")

    if os.path.exists(IMPORTANCE_PATH):
        with open(IMPORTANCE_PATH) as f:
            _importance = json.load(f)


def get_models() -> dict:
    if not _models:
        _load_models()
    return _models


# ---------------------------------------------------------------------------
# Feature loading
# ---------------------------------------------------------------------------

def _get_or_compute_features(match_id: int, conn) -> dict:
    """
    Read feature vector from v4.ml_feature_store if available.
    If not, compute it on-the-fly and store it.
    """
    cur = conn.cursor()
    cur.execute(
        "SELECT feature_vector FROM v4.ml_feature_store WHERE match_id = %s AND feature_set_id = %s",
        (match_id, FEATURE_SET_ID),
    )
    row = cur.fetchone()
    cur.close()

    if row:
        fv = row[0]
        return vector_from_json(fv) if isinstance(fv, str) else fv

    # Compute on-the-fly
    vector = compute_feature_vector_v4(match_id, conn)
    try:
        store_feature_vector(match_id, vector, conn, FEATURE_SET_ID)
    except Exception as exc:
        logger.warning(f"Could not store feature vector for match {match_id}: {exc}")

    return vector


def _build_dataframe(vector: dict) -> pd.DataFrame:
    row = {col: (np.nan if (v := vector.get(col, np.nan)) is None else v)
           for col in V4_FEATURE_COLUMNS}
    return pd.DataFrame([row], columns=V4_FEATURE_COLUMNS)


# ---------------------------------------------------------------------------
# Poisson → 1X2 distribution
# ---------------------------------------------------------------------------

def _poisson_1x2(lam_h: float, lam_a: float, max_goals: int = 10) -> dict:
    """Convert Poisson lambdas to 1X2 probabilities."""
    from math import exp, factorial
    def poisson_pmf(lam, k):
        return (lam ** k) * exp(-lam) / factorial(k)

    p_home = p_draw = p_away = 0.0
    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            p = poisson_pmf(lam_h, h) * poisson_pmf(lam_a, a)
            if h > a:
                p_home += p
            elif h == a:
                p_draw += p
            else:
                p_away += p

    total = p_home + p_draw + p_away
    if total > 0:
        p_home /= total
        p_draw /= total
        p_away /= total

    return {"home": round(p_home, 4), "draw": round(p_draw, 4), "away": round(p_away, 4)}


# ---------------------------------------------------------------------------
# Core prediction
# ---------------------------------------------------------------------------

def _run_inference(feature_df: pd.DataFrame, models: dict) -> dict:
    """Run all models on a feature DataFrame row. Returns raw prediction dict."""
    result = {}

    # 1X2 FT result
    if "1x2" in models:
        probs = models["1x2"].predict_proba(feature_df)[0]
        result["ft_1x2"] = {
            "home": round(float(probs[1]), 4),
            "draw": round(float(probs[0]), 4),
            "away": round(float(probs[2]), 4),
        }

    # Goals FT
    if "goals_h" in models and "goals_a" in models:
        lam_h = float(np.clip(models["goals_h"].predict(feature_df)[0], 0, 15))
        lam_a = float(np.clip(models["goals_a"].predict(feature_df)[0], 0, 15))
        result["goals"] = {
            "home_lambda": round(lam_h, 3),
            "away_lambda": round(lam_a, 3),
            "expected_home": round(lam_h, 2),
            "expected_away": round(lam_a, 2),
            "expected_total": round(lam_h + lam_a, 2),
            "1x2": _poisson_1x2(lam_h, lam_a),
        }

    # HT result
    if "ht_h" in models and "ht_a" in models:
        ht_h = float(np.clip(models["ht_h"].predict(feature_df)[0], 0, 10))
        ht_a = float(np.clip(models["ht_a"].predict(feature_df)[0], 0, 10))
        result["ht"] = {
            "home_lambda": round(ht_h, 3),
            "away_lambda": round(ht_a, 3),
            "expected_home": round(ht_h, 2),
            "expected_away": round(ht_a, 2),
            "1x2": _poisson_1x2(ht_h, ht_a),
        }

    # Corners
    if "corners_h" in models and "corners_a" in models:
        c_h = float(np.clip(models["corners_h"].predict(feature_df)[0], 0, 20))
        c_a = float(np.clip(models["corners_a"].predict(feature_df)[0], 0, 20))
        result["corners"] = {
            "expected_home":  round(c_h, 2),
            "expected_away":  round(c_a, 2),
            "expected_total": round(c_h + c_a, 2),
        }

    # Cards
    if "cards_h" in models and "cards_a" in models:
        y_h = float(np.clip(models["cards_h"].predict(feature_df)[0], 0, 10))
        y_a = float(np.clip(models["cards_a"].predict(feature_df)[0], 0, 10))
        result["cards"] = {
            "expected_home_yellows":  round(y_h, 2),
            "expected_away_yellows":  round(y_a, 2),
            "expected_total_yellows": round(y_h + y_a, 2),
        }

    return result


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

def _store_prediction(match_id: int, prediction: dict, conn) -> None:
    """Upsert prediction into v4.ml_predictions."""
    try:
        ft = prediction.get("ft_1x2", {})
        confidence = float(max(ft.get("home", 0), ft.get("draw", 0), ft.get("away", 0)))

        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO v4.ml_predictions (match_id, model_name, prediction_json, confidence_score)
            VALUES (%s, %s, %s::jsonb, %s)
            ON CONFLICT (match_id, model_name) DO UPDATE
                SET prediction_json  = EXCLUDED.prediction_json,
                    confidence_score = EXCLUDED.confidence_score,
                    created_at       = NOW()
            """,
            (match_id, MODEL_NAME, json.dumps(prediction), confidence),
        )
        conn.commit()
        cur.close()
    except Exception as exc:
        logger.warning(f"Could not store prediction for match {match_id}: {exc}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def predict_match_v4(match_id: int) -> dict:
    """
    Full V4 prediction for a single match.
    Returns prediction dict with ft_1x2, goals, ht, corners, cards.
    """
    models = get_models()
    if not models:
        raise RuntimeError("No V4 models loaded. Run train_all_v4.py first.")
    if "1x2" not in models:
        raise RuntimeError("V4 1X2 model not loaded.")

    t0 = time.time()
    conn = get_connection()
    try:
        vector = _get_or_compute_features(match_id, conn)
        feature_df = _build_dataframe(vector)
        prediction = _run_inference(feature_df, models)
        _store_prediction(match_id, prediction, conn)
    finally:
        conn.close()

    latency_ms = round((time.time() - t0) * 1000, 1)

    # Top features
    top_feats = []
    if _importance:
        feat_vals = {col: (float(v) if v is not None else float('nan'))
                     for col, v in ((c, feature_df.iloc[0][c]) for c in V4_FEATURE_COLUMNS)}
        top_feats = [
            {"feature": f["feature"], "importance": f["importance"]}
            for f in _importance
            if f["feature"] in feat_vals
        ][:5]

    return {
        "success":     True,
        "match_id":    match_id,
        "source":      "v4",
        "model_name":  MODEL_NAME,
        "predictions": prediction,
        "top_features": top_feats,
        "latency_ms":  latency_ms,
    }


def predict_matches_v4_batch(match_ids: list[int], store: bool = True) -> list[dict]:
    """
    Batch V4 prediction for multiple matches.
    Skips errors gracefully. Stores predictions if store=True.
    """
    models = get_models()
    if not models or "1x2" not in models:
        return [{"match_id": mid, "success": False, "error": "Models not loaded"} for mid in match_ids]

    conn = get_connection()
    results = []
    try:
        for match_id in match_ids:
            try:
                vector = _get_or_compute_features(match_id, conn)
                feature_df = _build_dataframe(vector)
                prediction = _run_inference(feature_df, models)
                if store:
                    _store_prediction(match_id, prediction, conn)

                results.append({
                    "match_id":    match_id,
                    "success":     True,
                    "predictions": prediction,
                    # Backward compat: expose ft_1x2 as probabilities at top level
                    "probabilities": prediction.get("ft_1x2"),
                })
            except Exception as exc:
                results.append({"match_id": match_id, "success": False, "error": str(exc)})
    finally:
        conn.close()

    return results


# ---------------------------------------------------------------------------
# FastAPI integration helpers
# ---------------------------------------------------------------------------

def get_v4_prediction_response(match_id: int) -> dict:
    """Thin wrapper for FastAPI endpoint /v4/predict."""
    return predict_match_v4(match_id)


def get_v4_batch_prediction_response(match_ids: list[int]) -> dict:
    """Thin wrapper for FastAPI endpoint /v4/predict/batch."""
    results = predict_matches_v4_batch(match_ids)
    return {"success": True, "results": results}
