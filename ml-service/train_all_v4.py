"""
train_all_v4.py — Orchestrate the full V4 ML training pipeline.

Steps:
  1. Feature engineering batch (features_v4_pipeline.py)
  2. Train 1X2 classifier
  3. Train Goals Poisson regressors
  4. Train HT Poisson regressors
  5. Train Corners Poisson regressors
  6. Train Cards Poisson regressors

Usage:
    python train_all_v4.py [options]

Options:
    --from-date YYYY-MM-DD  Features from date (default: 2015-01-01)
    --trials N              Optuna trials per model (default: 20)
    --no-tune               Skip Optuna, use default hyperparams (faster)
    --skip-features         Skip feature engineering step (reuse existing)
    --only MODEL            Train only one model: 1x2|goals|ht|corners|cards
"""

import argparse
import logging
import subprocess
import sys
import os
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def run(script: str, args: list[str]) -> bool:
    path = os.path.join(BASE_DIR, script)
    cmd  = [sys.executable, path] + args
    logger.info(f"Running: {' '.join(cmd)}")
    t0 = time.time()
    result = subprocess.run(cmd, cwd=BASE_DIR)
    elapsed = round(time.time() - t0, 1)
    if result.returncode != 0:
        logger.error(f"FAILED: {script} (exit {result.returncode}) [{elapsed}s]")
        return False
    logger.info(f"OK: {script} [{elapsed}s]")
    return True


def main():
    parser = argparse.ArgumentParser(description="Full V4 ML training pipeline")
    parser.add_argument("--from-date",      default="2015-01-01")
    parser.add_argument("--trials",         type=int, default=20)
    parser.add_argument("--no-tune",        action="store_true")
    parser.add_argument("--skip-features",  action="store_true")
    parser.add_argument("--only",           choices=["1x2", "goals", "ht", "corners", "cards"], default=None)
    args = parser.parse_args()

    tune_args = ["--no-tune"] if args.no_tune else ["--trials", str(args.trials)]

    steps = []

    # Step 1: Feature engineering
    if not args.skip_features and args.only is None:
        steps.append(("features_v4_pipeline.py", [
            "--from-date", args.from_date,
            "--min-history", "5",
        ]))

    # Step 2-6: Training scripts
    model_steps = {
        "1x2":     ("train_1x2_v4.py",     tune_args),
        "goals":   ("train_goals_v4.py",   tune_args),
        "ht":      ("train_ht_v4.py",      tune_args),
        "corners": ("train_corners_v4.py", tune_args),
        "cards":   ("train_cards_v4.py",   tune_args),
    }

    if args.only:
        key = args.only
        if key not in model_steps:
            logger.error(f"Unknown model: {key}")
            sys.exit(1)
        steps.append(model_steps[key])
    else:
        steps.extend(model_steps.values())

    # Execute sequentially
    failed = []
    for script, script_args in steps:
        ok = run(script, script_args)
        if not ok:
            failed.append(script)

    if failed:
        logger.error(f"Pipeline finished with failures: {failed}")
        sys.exit(1)
    else:
        logger.info("All steps completed successfully.")


if __name__ == "__main__":
    main()
