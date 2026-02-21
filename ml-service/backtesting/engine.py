"""
backtesting/engine.py — Walk-Forward Backtesting Engine (US_027)
=================================================================

Protocol
--------
1. Data is NEVER shuffled — always chronological.
2. Training window: start_date → cutoff_date.
3. Test window:  cutoff_date → cutoff_date + 3 months.
4. Walk forward: advance cutoff by 3 months and retrain.
5. Skip period if < MIN_TRAIN_SAMPLES in training window.
6. Bet simulation: bet when edge >= EDGE_THRESHOLD_BACKTEST (5%).
7. Stake: Quarter-Kelly with 5% hard cap, starting bankroll = 1000 units.

Usage (CLI)
-----------
    python -m backtesting.engine --league 39 --from 2022-08-01
    python -m backtesting.engine --league all --from 2022-08-01 --to 2026-01-31
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import warnings
from copy import deepcopy
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from dateutil.relativedelta import relativedelta
from sklearn.metrics import brier_score_loss, log_loss
from sklearn.preprocessing import LabelEncoder

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    EDGE_THRESHOLD_BACKTEST,
    KELLY_FRACTION,
    KELLY_MAX_STAKE,
    MIN_TRAIN_SAMPLES,
)
from db.reader import fetch_df
from features.builder import build_features, FEATURE_COLUMNS
from models.trainer import train_1x2  # reuse training logic

logger = logging.getLogger(__name__)
warnings.filterwarnings("ignore")

STARTING_BANKROLL = 1000.0
WALK_FORWARD_MONTHS = 3


# ── Kelly / Edge helpers ──────────────────────────────────────────────────────


def compute_edge(model_prob: float, decimal_odds: float, margin: float) -> float:
    """
    Edge = model_prob - (bookmaker implied prob, margin-adjusted).
    """
    raw_implied = 1.0 / decimal_odds
    true_implied = raw_implied / margin
    return model_prob - true_implied


def quarter_kelly(p: float, decimal_odds: float) -> float:
    """
    Quarter-Kelly fraction of bankroll.
    f* = (p*b - q) / b  →  /4  →  capped at KELLY_MAX_STAKE.
    b = decimal_odds - 1.
    """
    b = decimal_odds - 1.0
    if b <= 0 or p <= 0:
        return 0.0
    q = 1.0 - p
    raw_kelly = (p * b - q) / b
    if raw_kelly <= 0:
        return 0.0
    return min(raw_kelly * KELLY_FRACTION, KELLY_MAX_STAKE)


# ── Data helpers ──────────────────────────────────────────────────────────────


def _load_fixtures_with_odds(league_ids: list[int]) -> pd.DataFrame:
    """
    Load completed fixtures that have at least one odds row in V3_Odds (1X2 market).
    Ordered chronologically.
    """
    if league_ids:
        placeholders = ",".join("?" * len(league_ids))
        sql = f"""
            SELECT
                f.fixture_id AS fixture_id,
                f.date,
                f.home_team_id,
                f.away_team_id,
                f.league_id,
                f.goals_home,
                f.goals_away,
                o.value_home_over  AS odds_home,
                o.value_draw       AS odds_draw,
                o.value_away_under AS odds_away
            FROM V3_Fixtures f
            JOIN V3_Odds o
                ON o.fixture_id = f.fixture_id
                AND o.market_id = 1
            WHERE
                f.status_short IN ('FT', 'AET', 'PEN')
                AND f.goals_home IS NOT NULL
                AND f.league_id IN ({placeholders})
            GROUP BY f.fixture_id
            ORDER BY f.date ASC
        """
        params = tuple(league_ids)
    else:
        sql = """
            SELECT
                f.fixture_id AS fixture_id,
                f.date,
                f.home_team_id,
                f.away_team_id,
                f.league_id,
                f.goals_home,
                f.goals_away,
                o.value_home_over  AS odds_home,
                o.value_draw       AS odds_draw,
                o.value_away_under AS odds_away
            FROM V3_Fixtures f
            JOIN V3_Odds o
                ON o.fixture_id = f.fixture_id
                AND o.market_id = 1
            WHERE
                f.status_short IN ('FT', 'AET', 'PEN')
                AND f.goals_home IS NOT NULL
            GROUP BY f.fixture_id
            ORDER BY f.date ASC
        """
        params = ()

    df = fetch_df(sql, params)
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    return df


# ── Single walk-forward period ────────────────────────────────────────────────


def _run_period(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    period_label: str,
    bankroll: float,
) -> dict:
    """
    Train on `train_df`, simulate bets on `test_df`.
    Returns period metrics dict.
    """
    if len(train_df) < MIN_TRAIN_SAMPLES:
        logger.warning("Skipping period %s — insufficient training data (%d)", period_label, len(train_df))
        return None

    # ── Build feature matrix for TRAINING set ─────────────────────────────
    logger.info("Period %s — building train features (%d rows)...", period_label, len(train_df))

    train_rows = []
    for _, row in train_df.iterrows():
        try:
            feat = build_features(
                fixture_id=int(row["fixture_id"]),
                fixture_date=str(row["date"]),
                home_team_id=int(row["home_team_id"]),
                away_team_id=int(row["away_team_id"]),
                league_id=int(row["league_id"]),
            )
            feat.update({
                "fixture_id": int(row["fixture_id"]),
                "date": str(row["date"]),
                "goals_home": int(row["goals_home"]),
                "goals_away": int(row["goals_away"]),
                "league_id": int(row["league_id"]),
            })
            train_rows.append(feat)
        except Exception as e:
            logger.debug("Skipping train fixture %d: %s", row["fixture_id"], e)

    if len(train_rows) < MIN_TRAIN_SAMPLES:
        logger.warning("After feature build, only %d train rows — skipping period", len(train_rows))
        return None

    train_fm = pd.DataFrame(train_rows)

    # ── Train (reuse trainer logic but in-process) ─────────────────────────
    from lightgbm import LGBMClassifier
    from models.calibrator import MulticlassIsotonicCalibrator

    def label_1x2(row):
        if row["goals_home"] > row["goals_away"]:
            return "HOME"
        elif row["goals_home"] < row["goals_away"]:
            return "AWAY"
        return "DRAW"

    y_raw = train_fm.apply(label_1x2, axis=1).values
    X = train_fm[FEATURE_COLUMNS].values

    split = int(len(X) * 0.85)
    X_tr, X_v = X[:split], X[split:]
    y_tr, y_v = y_raw[:split], y_raw[split:]

    le = LabelEncoder()
    le.fit(["AWAY", "DRAW", "HOME"])
    y_tr_enc = le.transform(y_tr)
    y_v_enc = le.transform(y_v)

    lgb = LGBMClassifier(
        objective="multiclass", num_class=3, metric="multi_logloss",
        learning_rate=0.05, num_leaves=31, min_child_samples=20,
        n_estimators=300, class_weight="balanced", verbosity=-1, random_state=42,
    )
    lgb.fit(X_tr, y_tr_enc, eval_set=[(X_v, y_v_enc)])

    cal = MulticlassIsotonicCalibrator(classes=list(le.classes_))
    cal.fit(lgb.predict_proba(X_v), y_v_enc)

    # ── Simulate bets on TEST set ─────────────────────────────────────────
    logger.info("Period %s — simulating bets on %d test matches...", period_label, len(test_df))

    bets_placed = 0
    bets_won = 0
    bets_lost = 0
    pnl_total = 0.0
    peak = bankroll
    trough = bankroll
    probs_list = []
    labels_list = []
    not_evaluated = 0

    current_bankroll = bankroll

    for _, row in test_df.iterrows():
        oh = float(row["odds_home"]) if row["odds_home"] else None
        od = float(row["odds_draw"]) if row["odds_draw"] else None
        oa = float(row["odds_away"]) if row["odds_away"] else None

        if oh is None or od is None or oa is None:
            not_evaluated += 1
            continue

        # Build features (anti-leakage: date < fixture_date)
        try:
            feat = build_features(
                fixture_id=int(row["fixture_id"]),
                fixture_date=str(row["date"]),
                home_team_id=int(row["home_team_id"]),
                away_team_id=int(row["away_team_id"]),
                league_id=int(row["league_id"]),
            )
        except Exception as e:
            logger.debug("Feature build failed for fixture %d: %s", row["fixture_id"], e)
            not_evaluated += 1
            continue

        X_pred = np.array([[feat.get(c) for c in FEATURE_COLUMNS]], dtype=float)
        raw_p = lgb.predict_proba(X_pred)
        cal_p = cal.predict_proba(raw_p)[0]

        class_to_prob = dict(zip(le.classes_, cal_p))
        p_home = class_to_prob.get("HOME", 0.0)
        p_draw = class_to_prob.get("DRAW", 0.0)
        p_away = class_to_prob.get("AWAY", 0.0)

        probs_list.append(list(cal_p))

        # Actual outcome
        gh, ga = int(row["goals_home"]), int(row["goals_away"])
        actual = "HOME" if gh > ga else ("AWAY" if gh < ga else "DRAW")
        labels_list.append(le.transform([actual])[0])

        # Bookmaker margin
        margin = 1 / oh + 1 / od + 1 / oa

        # Best edge
        candidates = [
            ("HOME", p_home, oh),
            ("DRAW", p_draw, od),
            ("AWAY", p_away, oa),
        ]
        best_outcome, best_p, best_odds = max(candidates, key=lambda x: compute_edge(x[1], x[2], margin))
        edge = compute_edge(best_p, best_odds, margin)

        # Only bet if edge >= threshold
        if edge < EDGE_THRESHOLD_BACKTEST:
            continue

        stake_fraction = quarter_kelly(best_p, best_odds)
        if stake_fraction <= 0:
            continue

        stake = current_bankroll * stake_fraction
        bets_placed += 1

        if actual == best_outcome:
            pnl = stake * (best_odds - 1)
            bets_won += 1
        else:
            pnl = -stake
            bets_lost += 1

        current_bankroll += pnl
        pnl_total += pnl
        peak = max(peak, current_bankroll)
        trough = min(trough, current_bankroll)

    # ── Calibration metrics ───────────────────────────────────────────────
    brier = None
    ll = None
    if probs_list and labels_list:
        prob_arr = np.array(probs_list)
        label_arr = np.array(labels_list)
        nn = len(le.classes_)
        one_hot = np.eye(nn)[label_arr]
        brier = float(np.mean((prob_arr - one_hot) ** 2))
        ll = float(log_loss(label_arr, prob_arr, labels=list(range(nn))))

    roi = (pnl_total / bankroll) * 100 if bets_placed > 0 else 0.0
    max_drawdown = ((trough - peak) / peak) * 100 if peak > 0 else 0.0
    win_rate = (bets_won / bets_placed * 100) if bets_placed > 0 else 0.0

    return {
        "period": period_label,
        "total_matches_evaluated": len(test_df) - not_evaluated,
        "not_evaluated": not_evaluated,
        "value_bets_identified": bets_placed,
        "bets_won": bets_won,
        "bets_lost": bets_lost,
        "win_rate": round(win_rate, 2),
        "roi": round(roi, 2),
        "max_drawdown": round(max_drawdown, 2),
        "starting_bankroll": bankroll,
        "ending_bankroll": round(current_bankroll, 2),
        "calibration": {
            "brier_score": round(brier, 4) if brier else None,
            "log_loss": round(ll, 4) if ll else None,
        },
    }


# ── Main walk-forward loop ────────────────────────────────────────────────────


def run_backtest(
    league_ids: list[int],
    start_date: str,
    end_date: Optional[str] = None,
) -> dict:
    """
    Run walk-forward backtesting across `league_ids`.

    Returns a summary dict compatible with V3_Backtest_Results.
    """
    if end_date is None:
        end_date = datetime.utcnow().strftime("%Y-%m-%d")

    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")

    logger.info(
        "Starting walk-forward backtest: leagues=%s from=%s to=%s",
        league_ids or "ALL", start_date, end_date,
    )

    all_fixtures = _load_fixtures_with_odds(league_ids)
    all_fixtures = all_fixtures[all_fixtures["date"] >= start_date]

    if all_fixtures.empty:
        raise ValueError("No fixtures with odds found for the given parameters.")

    # Compute naive benchmark (always bet on bookmaker's favourite)
    naive_pnl = _naive_benchmark(all_fixtures)

    period_results = []
    cutoff = start_dt + relativedelta(months=WALK_FORWARD_MONTHS * 3)
    bankroll = STARTING_BANKROLL

    while cutoff < end_dt:
        period_start = start_dt.strftime("%Y-%m-%d")
        period_end = cutoff.strftime("%Y-%m-%d")
        test_end = (cutoff + relativedelta(months=WALK_FORWARD_MONTHS)).strftime("%Y-%m-%d")
        period_label = f"{period_end} → {test_end}"

        train_mask = (all_fixtures["date"] >= period_start) & (all_fixtures["date"] < period_end)
        test_mask = (all_fixtures["date"] >= period_end) & (all_fixtures["date"] < test_end)

        train_df = all_fixtures[train_mask].copy()
        test_df = all_fixtures[test_mask].copy()

        if test_df.empty:
            logger.info("No test data for %s — stopping.", period_label)
            break

        result = _run_period(train_df, test_df, period_label, bankroll)
        if result is not None:
            period_results.append(result)
            bankroll = result["ending_bankroll"]

        cutoff = cutoff + relativedelta(months=WALK_FORWARD_MONTHS)

    # ── Aggregate results ─────────────────────────────────────────────────
    if not period_results:
        return {"error": "No valid periods to backtest. Check data availability."}

    total_matches = sum(p["total_matches_evaluated"] for p in period_results)
    total_bets = sum(p["value_bets_identified"] for p in period_results)
    total_won = sum(p["bets_won"] for p in period_results)
    total_lost = sum(p["bets_lost"] for p in period_results)

    overall_roi = ((bankroll - STARTING_BANKROLL) / STARTING_BANKROLL) * 100
    win_rate = (total_won / total_bets * 100) if total_bets > 0 else 0.0
    max_dd = min((p["max_drawdown"] for p in period_results), default=0.0)

    valid_briers = [p["calibration"]["brier_score"] for p in period_results if p["calibration"]["brier_score"]]
    valid_lls = [p["calibration"]["log_loss"] for p in period_results if p["calibration"]["log_loss"]]

    league_names = _get_league_names(league_ids)

    summary = {
        "leagues": league_names,
        "period": f"{start_date} to {end_date}",
        "total_matches_evaluated": total_matches,
        "value_bets_identified": total_bets,
        "value_bet_rate": f"{(total_bets / total_matches * 100):.1f}%" if total_matches else "N/A",
        "bets_won": total_won,
        "bets_lost": total_lost,
        "win_rate": f"{win_rate:.1f}%",
        "roi": f"{overall_roi:+.1f}%",
        "max_drawdown": f"{max_dd:.1f}%",
        "starting_bankroll": STARTING_BANKROLL,
        "ending_bankroll": round(bankroll, 2),
        "calibration": {
            "brier_score": round(sum(valid_briers) / len(valid_briers), 4) if valid_briers else None,
            "log_loss": round(sum(valid_lls) / len(valid_lls), 4) if valid_lls else None,
        },
        "naive_roi": f"{naive_pnl:+.1f}%",
        "periods": period_results,
    }

    # Overfitting detector: if model consistently shows high ROI vs naive, flag it
    if overall_roi > 25 and overall_roi > naive_pnl * 3:
        logger.warning(
            "⚠️  Potential overfitting: model ROI=%.1f%% vs naive=%.1f%%. Review your features.",
            overall_roi, naive_pnl,
        )
        summary["overfitting_warning"] = True

    logger.info(
        "Backtest complete — ROI: %s  win_rate: %s  bets: %d",
        summary["roi"], summary["win_rate"], total_bets,
    )
    return summary


def _naive_benchmark(df: pd.DataFrame) -> float:
    """
    Naive strategy: always bet on the bookmaker's implied favourite.
    Returns the simulated ROI percentage.
    """
    bankroll = STARTING_BANKROLL
    for _, row in df.iterrows():
        oh = float(row["odds_home"]) if row["odds_home"] else None
        od = float(row["odds_draw"]) if row["odds_draw"] else None
        oa = float(row["odds_away"]) if row["odds_away"] else None
        if oh is None or od is None or oa is None:
            continue

        best = min([(oh, "HOME"), (od, "DRAW"), (oa, "AWAY")], key=lambda x: x[0])
        fav_odds, fav_outcome = best

        gh, ga = int(row["goals_home"]), int(row["goals_away"])
        actual = "HOME" if gh > ga else ("AWAY" if gh < ga else "DRAW")

        stake = bankroll * KELLY_MAX_STAKE  # flat 5% for naive
        if actual == fav_outcome:
            bankroll += stake * (fav_odds - 1)
        else:
            bankroll -= stake

    return ((bankroll - STARTING_BANKROLL) / STARTING_BANKROLL) * 100


def _get_league_names(league_ids: list[int]) -> list[str]:
    """Fetch league names from DB."""
    if not league_ids:
        return ["All Leagues"]
    placeholders = ",".join("?" * len(league_ids))
    try:
        df = fetch_df(
            f"SELECT name FROM V3_Leagues WHERE league_id IN ({placeholders})",
            tuple(league_ids),
        )
        return df["name"].tolist() if not df.empty else [str(i) for i in league_ids]
    except Exception:
        return [str(i) for i in league_ids]


# ── CLI ───────────────────────────────────────────────────────────────────────


def main():
    # dateutil is only needed at runtime for walk-forward date arithmetic
    try:
        from dateutil.relativedelta import relativedelta  # noqa: F401
    except ImportError:
        print("Install python-dateutil: pip install python-dateutil")
        sys.exit(1)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    )

    parser = argparse.ArgumentParser(description="Walk-forward backtesting engine")
    parser.add_argument(
        "--league",
        type=str,
        required=True,
        help="League ID(s) comma-separated, or 'all' for all leagues",
    )
    parser.add_argument("--from", dest="start_date", required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--to", dest="end_date", default=None, help="End date YYYY-MM-DD (default: today)")
    args = parser.parse_args()

    if args.league.lower() == "all":
        league_ids = []
    else:
        league_ids = [int(x.strip()) for x in args.league.split(",")]

    results = run_backtest(league_ids, args.start_date, args.end_date)
    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
