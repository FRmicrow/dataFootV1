"""
models/calibrator.py — Probability calibration wrappers for LightGBM models.

US_025 AC 4 implementation.

Strategy
--------
• For 1X2 (multiclass): wrap each class with an IsotonicRegression calibrator
  trained on the validation set only.
• For O/U 2.5 (binary): use sklearn's CalibratedClassifierCV with method='isotonic'
  and cv='prefit'.

Both models are saved as pickled pipelines that include the calibrator,
so at inference time you only call model.predict_proba(X).
"""

import logging
from dataclasses import dataclass

import numpy as np
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.metrics import brier_score_loss

logger = logging.getLogger(__name__)


def calibrate_binary(raw_model, X_val: np.ndarray, y_val: np.ndarray):
    """
    Wrap a pre-fitted binary LightGBM model with isotonic calibration.

    Parameters
    ----------
    raw_model  : A fitted LGBMClassifier.
    X_val      : Validation features (nunmpy array or DataFrame).
    y_val      : Validation binary labels.

    Returns
    -------
    calibrated : CalibratedClassifierCV fitted on validation data.
    brier_before : Brier score before calibration.
    brier_after  : Brier score after calibration.
    """
    # Brier score before
    raw_probs = raw_model.predict_proba(X_val)[:, 1]
    brier_before = brier_score_loss(y_val, raw_probs)

    calibrated = CalibratedClassifierCV(estimator=raw_model, cv="prefit", method="isotonic")
    calibrated.fit(X_val, y_val)

    cal_probs = calibrated.predict_proba(X_val)[:, 1]
    brier_after = brier_score_loss(y_val, cal_probs)

    logger.info(
        "Binary calibration — Brier before: %.4f  after: %.4f  (improvement: %+.4f)",
        brier_before,
        brier_after,
        brier_before - brier_after,
    )
    return calibrated, brier_before, brier_after


@dataclass
class MulticlassIsotonicCalibrator:
    """
    One-vs-rest isotonic calibration for multiclass probabilities.

    Stores a list of IsotonicRegression objects (one per class),
    fits them on validation data, and re-normalises probabilities at inference.
    """

    classes: list
    calibrators: list = None

    def fit(self, raw_probs_val: np.ndarray, y_val_encoded: np.ndarray):
        """
        Parameters
        ----------
        raw_probs_val   : (n_samples, n_classes) raw probabilities from LightGBM.
        y_val_encoded   : integer-encoded labels 0..n_classes-1.
        """
        from sklearn.isotonic import IsotonicRegression

        n_classes = len(self.classes)
        self.calibrators = []

        for cls_idx in range(n_classes):
            binary_labels = (y_val_encoded == cls_idx).astype(int)
            probs_cls = raw_probs_val[:, cls_idx]

            iso = IsotonicRegression(out_of_bounds="clip")
            iso.fit(probs_cls, binary_labels)
            self.calibrators.append(iso)

        return self

    def predict_proba(self, raw_probs: np.ndarray) -> np.ndarray:
        """Apply calibration and re-normalise rows so each sums to 1."""
        if self.calibrators is None:
            raise RuntimeError("Call .fit() before .predict_proba()")

        corrected = np.column_stack(
            [cal.predict(raw_probs[:, i]) for i, cal in enumerate(self.calibrators)]
        )
        # Normalise
        row_sums = corrected.sum(axis=1, keepdims=True)
        row_sums = np.where(row_sums == 0, 1, row_sums)
        return corrected / row_sums

    def brier_score(self, raw_probs: np.ndarray, y_encoded: np.ndarray) -> float:
        """Multiclass Brier score (mean over classes and samples)."""
        n_classes = len(self.classes)
        cal_probs = self.predict_proba(raw_probs)
        one_hot = np.eye(n_classes)[y_encoded]
        return float(np.mean((cal_probs - one_hot) ** 2))
