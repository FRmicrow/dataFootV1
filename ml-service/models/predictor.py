"""
models/predictor.py — Load a saved model bundle and run inference.
===================================================================

Loads the latest active model from saved_models/ and returns calibrated
probabilities for a given feature dict.

Used by main.py (POST /predict) and the backtesting engine.
"""

from __future__ import annotations

import json
import logging
import pickle
import sys
from pathlib import Path
from typing import Optional

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import MODEL_DIR
from features.builder import FEATURE_COLUMNS

logger = logging.getLogger(__name__)

# ── Model bundle cache (in-process, reset on reload) ─────────────────────────
_cache: dict[str, dict] = {}


def _get_latest_model_file(target: str) -> Optional[Path]:
    """Return the .pkl path with the highest version number for `target`."""
    candidates = list(MODEL_DIR.glob(f"{target}_v*.pkl"))
    if not candidates:
        return None

    def _version(p: Path) -> int:
        try:
            return int(p.stem.split("_v")[1])
        except (IndexError, ValueError):
            return -1

    return max(candidates, key=_version)


def _load_model(target: str) -> dict:
    """Load (and cache) the model bundle for `target`."""
    global _cache
    if target in _cache:
        return _cache[target]

    model_path = _get_latest_model_file(target)
    if model_path is None:
        raise FileNotFoundError(
            f"No trained model found for '{target}' in {MODEL_DIR}.\n"
            "Run: python -m models.trainer --target " + target
        )

    with open(model_path, "rb") as f:
        bundle = pickle.load(f)

    # Load corresponding meta
    version = int(model_path.stem.split("_v")[1])
    meta_path = MODEL_DIR / f"{target}_v{version}_meta.json"
    meta = {}
    if meta_path.exists():
        with open(meta_path) as f:
            meta = json.load(f)

    bundle["_meta"] = meta
    bundle["_version"] = version
    _cache[target] = bundle
    logger.info("Loaded model: %s (version %d)", target, version)
    return bundle


def reload_models():
    """Force reload of all cached models (call after retraining)."""
    global _cache
    _cache = {}
    logger.info("Model cache cleared — models will reload on next prediction.")


def get_model_meta(target: str = "1x2") -> dict:
    """Return the metadata for the currently loaded model."""
    try:
        bundle = _load_model(target)
        return bundle.get("_meta", {})
    except FileNotFoundError:
        return {"error": f"No model trained yet for target '{target}'"}


# ── SHAP-based feature impact ─────────────────────────────────────────────────


def _compute_shap_top_features(model, X: np.ndarray, n: int = 5) -> list[dict]:
    """
    Use SHAP to compute feature impact for the predicted class.
    Returns top `n` features sorted by absolute SHAP value.
    Falls back gracefully to feature importance if SHAP fails.
    """
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X)

        # For multiclass shap_values is a list of arrays (one per class)
        if isinstance(shap_values, list):
            # Use SHAP for all classes, take the max absolute per feature
            combined = np.abs(np.array(shap_values)).mean(axis=0)[0]
        else:
            combined = np.abs(shap_values[0])

        top_idx = np.argsort(combined)[::-1][:n]
        return [
            {
                "feature": FEATURE_COLUMNS[i],
                "impact": round(float(combined[i]), 4),
            }
            for i in top_idx
        ]
    except Exception as e:
        logger.warning("SHAP computation failed (%s), using feature importance", e)
        try:
            importances = model.feature_importances_
            top_idx = np.argsort(importances)[::-1][:n]
            return [
                {
                    "feature": FEATURE_COLUMNS[i],
                    "impact": round(float(importances[i]) / max(importances.sum(), 1), 4),
                }
                for i in top_idx
            ]
        except Exception:
            return []


# ── Main prediction function ──────────────────────────────────────────────────


def predict_1x2(features: dict) -> dict:
    """
    Predict 1X2 match outcome probabilities.

    Parameters
    ----------
    features : dict mapping feature name → value (NaN-safe).

    Returns
    -------
    {
        "model_version": int,
        "target": "1x2",
        "probabilities": {"home": float, "draw": float, "away": float},
        "top_features": [{"feature": str, "impact": float}, ...]
    }
    """
    bundle = _load_model("1x2")
    model = bundle["model"]
    calibrator = bundle.get("calibrator")
    le = bundle["label_encoder"]

    # Build feature vector in correct column order
    X = np.array([[features.get(col) for col in FEATURE_COLUMNS]], dtype=float)

    raw_probs = model.predict_proba(X)  # shape (1, 3)

    if calibrator is not None:
        probs = calibrator.predict_proba(raw_probs)[0]
    else:
        probs = raw_probs[0]

    # Map index → class name
    class_to_prob = dict(zip(le.classes_, probs))

    top_features = _compute_shap_top_features(model, X)

    return {
        "model_version": bundle["_version"],
        "target": "1x2",
        "probabilities": {
            "home": round(float(class_to_prob.get("HOME", 0.33)), 4),
            "draw": round(float(class_to_prob.get("DRAW", 0.33)), 4),
            "away": round(float(class_to_prob.get("AWAY", 0.33)), 4),
        },
        "top_features": top_features,
    }


def predict_ou25(features: dict) -> dict:
    """
    Predict O/U 2.5 goal probabilities.

    Returns
    -------
    {
        "model_version": int,
        "target": "ou25",
        "probabilities": {"over": float, "under": float},
        "top_features": [...]
    }
    """
    bundle = _load_model("ou25")
    model = bundle["model"]
    le = bundle["label_encoder"]

    X = np.array([[features.get(col) for col in FEATURE_COLUMNS]], dtype=float)

    probs = model.predict_proba(X)[0]  # already calibrated (CalibratedClassifierCV)
    class_to_prob = dict(zip(le.classes_, probs))

    # Extract raw model for SHAP (CalibratedClassifierCV wraps original)
    raw_model = getattr(model, "estimator", model)
    top_features = _compute_shap_top_features(raw_model, X)

    return {
        "model_version": bundle["_version"],
        "target": "ou25",
        "probabilities": {
            "over": round(float(class_to_prob.get("OVER", 0.5)), 4),
            "under": round(float(class_to_prob.get("UNDER", 0.5)), 4),
        },
        "top_features": top_features,
    }
