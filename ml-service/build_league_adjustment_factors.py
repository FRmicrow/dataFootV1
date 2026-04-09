import json
import math
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

from db_config import get_connection


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORT_PATH = os.path.join(BASE_DIR, "reports", "league_adjustment_factors.json")


def zscore(series: pd.Series) -> pd.Series:
    std = float(series.std(ddof=0))
    if std <= 1e-9:
        return pd.Series([0.0] * len(series), index=series.index)
    mean = float(series.mean())
    return (series - mean) / std


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def fetch_league_style_frame(min_date: str) -> pd.DataFrame:
    conn = get_connection()
    try:
        query = """
            SELECT
                f.league_id,
                l.name AS league_name,
                COUNT(*) AS fixture_count,
                AVG(COALESCE(f.goals_home, 0) + COALESCE(f.goals_away, 0)) AS goals_per_match,
                AVG(COALESCE(f.xg_home, 0) + COALESCE(f.xg_away, 0)) AS xg_per_match,
                AVG(COALESCE(fs_home.shots_total, 0) + COALESCE(fs_away.shots_total, 0)) AS shots_per_match,
                AVG(COALESCE(fs_home.shots_on_goal, 0) + COALESCE(fs_away.shots_on_goal, 0)) AS shots_on_goal_per_match,
                AVG(COALESCE(fs_home.corner_kicks, 0) + COALESCE(fs_away.corner_kicks, 0)) AS corners_per_match,
                AVG(COALESCE(fs_home.fouls, 0) + COALESCE(fs_away.fouls, 0)) AS fouls_per_match,
                AVG(
                    COALESCE(fs_home.yellow_cards, 0) + COALESCE(fs_home.red_cards, 0) +
                    COALESCE(fs_away.yellow_cards, 0) + COALESCE(fs_away.red_cards, 0)
                ) AS cards_per_match,
                AVG(
                    (
                        COALESCE(fs_home.pass_accuracy_pct, 0) +
                        COALESCE(fs_away.pass_accuracy_pct, 0)
                    ) / 2.0
                ) AS pass_accuracy_pct_avg,
                AVG(
                    ABS(COALESCE(fs_home.ball_possession_pct, 50) - 50) +
                    ABS(COALESCE(fs_away.ball_possession_pct, 50) - 50)
                ) / 2.0 AS possession_gap_avg,
                AVG(
                    COALESCE(fs_home_2h.shots_total, 0) + COALESCE(fs_away_2h.shots_total, 0)
                ) AS second_half_shots_per_match,
                AVG(
                    (CASE WHEN (COALESCE(f.goals_home, 0) + COALESCE(f.goals_away, 0)) > 0
                     THEN (COALESCE(f.goals_home, 0) + COALESCE(f.goals_away, 0))
                     ELSE NULL END)
                ) AS non_zero_goals_per_match
            FROM V3_Fixtures f
            JOIN V3_Leagues l ON l.league_id = f.league_id
            JOIN V3_Fixture_Stats fs_home
              ON fs_home.fixture_id = f.fixture_id
             AND fs_home.team_id = f.home_team_id
             AND fs_home.half = 'FT'
            JOIN V3_Fixture_Stats fs_away
              ON fs_away.fixture_id = f.fixture_id
             AND fs_away.team_id = f.away_team_id
             AND fs_away.half = 'FT'
            LEFT JOIN V3_Fixture_Stats fs_home_2h
              ON fs_home_2h.fixture_id = f.fixture_id
             AND fs_home_2h.team_id = f.home_team_id
             AND fs_home_2h.half = '2H'
            LEFT JOIN V3_Fixture_Stats fs_away_2h
              ON fs_away_2h.fixture_id = f.fixture_id
             AND fs_away_2h.team_id = f.away_team_id
             AND fs_away_2h.half = '2H'
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND f.date >= %s
            GROUP BY f.league_id, l.name
            HAVING COUNT(*) >= 120
            ORDER BY COUNT(*) DESC
        """
        return pd.read_sql_query(query, conn, params=(min_date,))
    finally:
        conn.close()


def build_market_factors(df: pd.DataFrame) -> dict:
    work = df.copy()
    work["xg_coverage"] = work["xg_per_match"].fillna(0.0).apply(lambda v: 1.0 if v > 0.05 else 0.0)
    work["goal_openness_raw"] = (
        0.45 * zscore(work["goals_per_match"].fillna(0.0))
        + 0.25 * zscore(work["shots_on_goal_per_match"].fillna(0.0))
        + 0.15 * zscore(work["shots_per_match"].fillna(0.0))
        + 0.15 * zscore(work["xg_per_match"].fillna(work["goals_per_match"]))
    )
    work["tempo_raw"] = (
        0.45 * zscore(work["shots_per_match"].fillna(0.0))
        + 0.25 * zscore(work["corners_per_match"].fillna(0.0))
        - 0.20 * zscore(work["fouls_per_match"].fillna(0.0))
        + 0.10 * zscore(work["second_half_shots_per_match"].fillna(0.0))
    )
    work["control_raw"] = (
        0.60 * zscore(work["pass_accuracy_pct_avg"].fillna(0.0))
        + 0.40 * zscore(work["possession_gap_avg"].fillna(0.0))
    )
    work["discipline_raw"] = (
        0.60 * zscore(work["cards_per_match"].fillna(0.0))
        + 0.40 * zscore(work["fouls_per_match"].fillna(0.0))
    )
    work["corner_pressure_raw"] = (
        0.50 * zscore(work["corners_per_match"].fillna(0.0))
        + 0.25 * zscore(work["shots_per_match"].fillna(0.0))
        + 0.15 * zscore(work["shots_on_goal_per_match"].fillna(0.0))
        - 0.10 * zscore(work["control_raw"].fillna(0.0))
    )
    work["sample_confidence"] = work["fixture_count"].apply(
        lambda count: clamp(math.sqrt(float(count) / 400.0), 0.45, 1.0)
    )
    work["recommended_total_goals_delta"] = work.apply(
        lambda row: clamp(
            (
                0.11 * float(row["goal_openness_raw"])
                + 0.05 * float(row["tempo_raw"])
                - 0.04 * float(row["control_raw"])
            )
            * float(row["sample_confidence"]),
            -0.18,
            0.18,
        ),
        axis=1,
    )
    work["recommended_over_2_5_delta"] = work.apply(
        lambda row: clamp(
            (
                0.020 * float(row["goal_openness_raw"])
                + 0.008 * float(row["tempo_raw"])
                - 0.008 * float(row["control_raw"])
            )
            * float(row["sample_confidence"]),
            -0.03,
            0.03,
        ),
        axis=1,
    )
    work["recommended_adjustment_cap"] = work["sample_confidence"].apply(
        lambda c: clamp(0.015 + 0.015 * float(c), 0.02, 0.03)
    )

    goals_market = {}
    cards_market = {}
    corners_market = {}
    for row in work.to_dict(orient="records"):
        league_payload = {
            "league_id": int(row["league_id"]),
            "league_name": row["league_name"],
            "sample_size": int(row["fixture_count"]),
            "window": "5Y_ROLLING_STYLE_BASELINE",
            "style_metrics": {
                "goals_per_match": float(row["goals_per_match"] or 0.0),
                "xg_per_match": float(row["xg_per_match"] or 0.0),
                "shots_per_match": float(row["shots_per_match"] or 0.0),
                "shots_on_goal_per_match": float(row["shots_on_goal_per_match"] or 0.0),
                "corners_per_match": float(row["corners_per_match"] or 0.0),
                "fouls_per_match": float(row["fouls_per_match"] or 0.0),
                "cards_per_match": float(row["cards_per_match"] or 0.0),
                "pass_accuracy_pct_avg": float(row["pass_accuracy_pct_avg"] or 0.0),
                "possession_gap_avg": float(row["possession_gap_avg"] or 0.0),
                "second_half_shots_per_match": float(row["second_half_shots_per_match"] or 0.0),
            },
        }
        goals_market[str(int(row["league_id"]))] = {
            **league_payload,
            "indices": {
                "goal_openness_index": round(float(row["goal_openness_raw"]), 6),
                "tempo_index": round(float(row["tempo_raw"]), 6),
                "control_index": round(float(row["control_raw"]), 6),
                "discipline_index": round(float(row["discipline_raw"]), 6),
                "sample_confidence": round(float(row["sample_confidence"]), 6),
            },
            "recommended_total_goals_delta": round(float(row["recommended_total_goals_delta"]), 6),
            "recommended_over_2_5_delta": round(float(row["recommended_over_2_5_delta"]), 6),
            "recommended_adjustment_cap": round(float(row["recommended_adjustment_cap"]), 6),
        }
        cards_market[str(int(row["league_id"]))] = {
            **league_payload,
            "indices": {
                "discipline_index": round(float(row["discipline_raw"]), 6),
                "tempo_index": round(float(row["tempo_raw"]), 6),
                "control_index": round(float(row["control_raw"]), 6),
                "sample_confidence": round(float(row["sample_confidence"]), 6),
            },
            "recommended_total_cards_delta": round(
                clamp(
                    (
                        0.16 * float(row["discipline_raw"])
                        + 0.05 * float(row["tempo_raw"])
                        - 0.03 * float(row["control_raw"])
                    )
                    * float(row["sample_confidence"]),
                    -0.28,
                    0.28,
                ),
                6,
            ),
            "recommended_over_4_5_delta": round(
                clamp(
                    (
                        0.025 * float(row["discipline_raw"])
                        + 0.008 * float(row["tempo_raw"])
                        - 0.006 * float(row["control_raw"])
                    )
                    * float(row["sample_confidence"]),
                    -0.04,
                    0.04,
                ),
                6,
            ),
            "recommended_adjustment_cap": round(
                clamp(0.02 + 0.02 * float(row["sample_confidence"]), 0.025, 0.04),
                6,
            ),
        }
        corners_market[str(int(row["league_id"]))] = {
            **league_payload,
            "indices": {
                "corner_pressure_index": round(float(row["corner_pressure_raw"]), 6),
                "tempo_index": round(float(row["tempo_raw"]), 6),
                "control_index": round(float(row["control_raw"]), 6),
                "goal_openness_index": round(float(row["goal_openness_raw"]), 6),
                "sample_confidence": round(float(row["sample_confidence"]), 6),
            },
            "recommended_total_corners_delta": round(
                clamp(
                    (
                        0.22 * float(row["corner_pressure_raw"])
                        + 0.08 * float(row["tempo_raw"])
                        - 0.03 * float(row["control_raw"])
                    )
                    * float(row["sample_confidence"]),
                    -0.6,
                    0.6,
                ),
                6,
            ),
            "recommended_over_9_5_delta": round(
                clamp(
                    (
                        0.028 * float(row["corner_pressure_raw"])
                        + 0.010 * float(row["tempo_raw"])
                        - 0.006 * float(row["control_raw"])
                    ),
                    -0.035,
                    0.035,
                ),
                6,
            ),
            "recommended_adjustment_cap": round(
                clamp(0.02 + 0.015 * float(row["sample_confidence"]), 0.025, 0.035),
                6,
            ),
        }
    return {"goals_ou": goals_market, "cards_ou": cards_market, "corners_ou": corners_market}


def main():
    today = datetime.now(timezone.utc).date()
    min_date = (today - timedelta(days=365 * 5)).isoformat()
    league_frame = fetch_league_style_frame(min_date)
    markets = build_market_factors(league_frame)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_window_start": min_date,
        "markets": markets,
    }
    Path(os.path.dirname(REPORT_PATH)).mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, "w") as handle:
        json.dump(payload, handle, indent=2)
    print(
        json.dumps(
            {
                "report_path": REPORT_PATH,
                "league_count_goals": len(markets["goals_ou"]),
                "league_count_cards": len(markets["cards_ou"]),
                "league_count_corners": len(markets["corners_ou"]),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
