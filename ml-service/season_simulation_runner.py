import json
import math
from datetime import datetime

import joblib
import pandas as pd

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, normalize_feature_vector
from model_paths import get_global_1x2_model_path_for_horizon
from src.models.cards_total.inference import predict_total_cards
from src.models.corners_total.inference import predict_total_corners
from src.models.goals_total.inference import predict_total_goals
from src.models.ht_result.inference import predict_ht_result


FINISHED_STATUSES = ("FT", "AET", "PEN")
OU_LINES = {
    "GOALS_OU": 2.5,
    "CORNERS_OU": 9.5,
    "CARDS_OU": 4.5,
}


def _utc_now():
    return datetime.utcnow().isoformat() + "Z"


def _safe_log_loss(labels, probability_rows):
    if not labels:
        return None

    epsilon = 1e-15
    total = 0.0

    for label, probs in zip(labels, probability_rows):
        probability = max(epsilon, min(1 - epsilon, float(probs.get(label, 0.0))))
        total += -math.log(probability)

    return total / len(labels)


def _safe_brier(labels, probability_rows):
    if not labels:
        return None

    total = 0.0
    classes = [0, 1, 2]

    for label, probs in zip(labels, probability_rows):
        for klass in classes:
            observed = 1.0 if klass == label else 0.0
            total += (float(probs.get(klass, 0.0)) - observed) ** 2

    return total / len(labels)


def _map_actual_winner(goals_home, goals_away):
    if goals_home > goals_away:
        return 1
    if goals_away > goals_home:
        return 2
    return 0


def _map_actual_outcome_label(code):
    return {1: "1", 0: "X", 2: "2"}.get(code, "X")


def _normalize_1x2_probabilities(probs):
    return {
        1: float(probs.get("1", probs.get(1, 0.0))),
        0: float(probs.get("N", probs.get("X", probs.get(0, 0.0)))),
        2: float(probs.get("2", probs.get(2, 0.0))),
    }


def _pick_1x2(prob_map):
    if prob_map[1] >= prob_map[0] and prob_map[1] >= prob_map[2]:
        return 1
    if prob_map[2] >= prob_map[1] and prob_map[2] >= prob_map[0]:
        return 2
    return 0


def _extract_total(prediction, key):
    block = prediction.get(key, {})
    return float(block.get("total")) if block.get("total") is not None else None


def _ou_outcomes(probabilities, line):
    over_key = f"Over {line}"
    under_key = f"Under {line}"
    over = float(probabilities.get(over_key, 0.0))
    under = float(probabilities.get(under_key, 0.0))
    if over >= under:
        return over_key, under_key, over, under
    return under_key, over_key, under, over


def _map_total_actual(value, line):
    if value is None:
        return None
    return f"Over {line}" if float(value) > float(line) else f"Under {line}"


def _load_matches(conn, league_id, season_year):
    query = """
        SELECT
            f.fixture_id,
            f.date,
            f.round,
            f.goals_home,
            f.goals_away,
            f.score_halftime_home,
            f.score_halftime_away,
            COUNT(CASE WHEN fst.half = 'FT' THEN 1 END) AS ft_stats_count,
            COALESCE(SUM(CASE WHEN fst.half = 'FT' THEN fst.corner_kicks ELSE 0 END), 0) AS total_corners,
            COALESCE(SUM(CASE WHEN fst.half = 'FT' THEN COALESCE(fst.yellow_cards, 0) + COALESCE(fst.red_cards, 0) ELSE 0 END), 0) AS total_cards,
            fs.feature_vector
        FROM V3_Fixtures f
        JOIN V3_ML_Feature_Store fs ON fs.fixture_id = f.fixture_id
        LEFT JOIN V3_Fixture_Stats fst ON fst.fixture_id = f.fixture_id
        WHERE f.league_id = %s
          AND f.season_year = %s
          AND f.status_short IN %s
        GROUP BY
            f.fixture_id,
            f.date,
            f.round,
            f.goals_home,
            f.goals_away,
            f.score_halftime_home,
            f.score_halftime_away,
            fs.feature_vector
        ORDER BY f.date ASC, f.fixture_id ASC
    """
    return pd.read_sql_query(query, conn, params=(league_id, season_year, FINISHED_STATUSES))


def _update_simulation(conn, simulation_id, **fields):
    if not fields:
        return

    assignments = []
    values = []
    for key, value in fields.items():
        assignments.append(f"{key} = %s")
        values.append(value)
    values.append(simulation_id)

    sql = f"""
        UPDATE V3_Forge_Simulations
        SET {", ".join(assignments)}
        WHERE id = %s
    """

    cur = conn.cursor()
    cur.execute(sql, values)
    conn.commit()
    cur.close()


def _flush_results(conn, rows):
    if not rows:
        return

    sql = """
        INSERT INTO V3_Forge_Results (
            simulation_id,
            fixture_id,
            market_type,
            market_label,
            model_version,
            prob_home,
            prob_draw,
            prob_away,
            predicted_score,
            actual_winner,
            is_correct,
            edge_value,
            retrieved_at,
            predicted_outcome,
            alternate_outcome,
            actual_result,
            primary_probability,
            alternate_probability,
            actual_numeric_value,
            expected_total
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s, %s)
    """
    cur = conn.cursor()
    cur.executemany(sql, rows)
    conn.commit()
    cur.close()


def _build_ft_prediction_row(simulation_id, fixture_id, probabilities, actual_outcome, model_version):
    home = probabilities.get(1, 0.0)
    draw = probabilities.get(0, 0.0)
    away = probabilities.get(2, 0.0)
    predicted = _pick_1x2(probabilities)

    return (
        simulation_id,
        fixture_id,
        "FT_1X2",
        "FT 1X2",
        model_version,
        home,
        draw,
        away,
        None,
        actual_outcome,
        1 if predicted == actual_outcome else 0,
        None,
        _map_actual_outcome_label(predicted),
        None,
        _map_actual_outcome_label(actual_outcome),
        max(home, draw, away),
        sorted([home, draw, away], reverse=True)[1],
        None,
        None,
    )


def _build_ht_prediction_row(simulation_id, fixture_id, prediction, actual_outcome):
    probabilities = _normalize_1x2_probabilities(prediction.get("probabilities_1n2", {}))
    home = probabilities.get(1, 0.0)
    draw = probabilities.get(0, 0.0)
    away = probabilities.get(2, 0.0)
    predicted = _pick_1x2(probabilities)

    return (
        simulation_id,
        fixture_id,
        "HT_1X2",
        "HT 1X2",
        prediction.get("model_version"),
        home,
        draw,
        away,
        None,
        actual_outcome,
        1 if predicted == actual_outcome else 0,
        None,
        _map_actual_outcome_label(predicted),
        None,
        _map_actual_outcome_label(actual_outcome),
        max(home, draw, away),
        sorted([home, draw, away], reverse=True)[1],
        None,
        float(prediction.get("expected_goals_ht", {}).get("home", 0.0)) + float(prediction.get("expected_goals_ht", {}).get("away", 0.0)),
    )


def _build_ou_prediction_row(simulation_id, fixture_id, market_type, market_label, prediction, actual_total):
    line = OU_LINES[market_type]
    probabilities = prediction.get("over_under_probabilities", {})
    primary, alternate, primary_prob, alternate_prob = _ou_outcomes(probabilities, line)
    actual_result = _map_total_actual(actual_total, line)
    expected_key = {
        "GOALS_OU": "expected_goals",
        "CORNERS_OU": "expected_corners",
        "CARDS_OU": "expected_cards",
    }[market_type]
    expected_total = _extract_total(prediction, expected_key)

    return (
        simulation_id,
        fixture_id,
        market_type,
            market_label,
            prediction.get("model_version"),
            None,
            None,
            None,
            None,
            None,
            1 if actual_result and primary == actual_result else (0 if actual_result else None),
            None,
            primary,
            alternate,
            actual_result,
        primary_prob,
        alternate_prob,
        float(actual_total) if actual_total is not None else None,
        expected_total,
    )


def _compute_ft_prediction(model, row):
    vector = normalize_feature_vector(json.loads(row["feature_vector"]))
    features = pd.DataFrame([vector], columns=GLOBAL_1X2_FEATURE_COLUMNS)
    probabilities = model.predict_proba(features)[0]
    return {int(label): float(prob) for label, prob in zip(model.classes_, probabilities)}


def run_season_simulation(simulation_id, league_id, season_year, horizon_type="FULL_HISTORICAL"):
    conn = get_connection()

    try:
        ft_model_path = get_global_1x2_model_path_for_horizon(horizon_type)
        ft_model = joblib.load(ft_model_path)

        _update_simulation(
            conn,
            simulation_id,
            status="RUNNING",
            stage="PREPARING",
            current_month=None,
            total_months=0,
            completed_months=0,
            last_heartbeat=datetime.utcnow(),
            error_log=None,
        )

        fixtures_df = _load_matches(conn, league_id, season_year)
        total_matches = len(fixtures_df.index)

        if total_matches == 0:
            _update_simulation(
                conn,
                simulation_id,
                status="FAILED",
                stage="NO_DATA",
                error_log="No finished fixtures with feature vectors found for this league/season.",
                last_heartbeat=datetime.utcnow(),
            )
            return

        _update_simulation(
            conn,
            simulation_id,
            stage="RUNNING",
            total_months=total_matches,
            last_heartbeat=datetime.utcnow(),
        )

        clear_cur = conn.cursor()
        clear_cur.execute("DELETE FROM V3_Forge_Results WHERE simulation_id = %s", (simulation_id,))
        conn.commit()
        clear_cur.close()

        ft_labels = []
        ft_probability_rows = []
        ht_labels = []
        ht_probability_rows = []
        summary = {
            "FT_1X2": {"hits": 0, "count": 0},
            "HT_1X2": {"hits": 0, "count": 0},
            "GOALS_OU": {"hits": 0, "count": 0, "mae_total": 0.0},
            "CORNERS_OU": {"hits": 0, "count": 0, "mae_total": 0.0},
            "CARDS_OU": {"hits": 0, "count": 0, "mae_total": 0.0},
        }

        buffered_rows = []

        for index, row in fixtures_df.iterrows():
            fixture_id = int(row["fixture_id"])

            actual_ft = _map_actual_winner(int(row["goals_home"]), int(row["goals_away"]))
            ft_probabilities = _compute_ft_prediction(ft_model, row)
            buffered_rows.append(
                _build_ft_prediction_row(simulation_id, fixture_id, ft_probabilities, actual_ft, f"global_1x2_{horizon_type.lower()}")
            )
            ft_labels.append(actual_ft)
            ft_probability_rows.append(ft_probabilities)
            summary["FT_1X2"]["count"] += 1
            summary["FT_1X2"]["hits"] += buffered_rows[-1][10]

            if row["score_halftime_home"] is not None and row["score_halftime_away"] is not None:
                actual_ht = _map_actual_winner(int(row["score_halftime_home"]), int(row["score_halftime_away"]))
                ht_prediction = predict_ht_result(fixture_id, version="v2")
                ht_row = _build_ht_prediction_row(simulation_id, fixture_id, ht_prediction, actual_ht)
                buffered_rows.append(ht_row)
                ht_labels.append(actual_ht)
                ht_probability_rows.append(_normalize_1x2_probabilities(ht_prediction.get("probabilities_1n2", {})))
                summary["HT_1X2"]["count"] += 1
                summary["HT_1X2"]["hits"] += ht_row[10]

            goals_prediction = predict_total_goals(fixture_id)
            actual_goals = float(int(row["goals_home"]) + int(row["goals_away"]))
            goals_row = _build_ou_prediction_row(simulation_id, fixture_id, "GOALS_OU", "Goals O/U 2.5", goals_prediction, actual_goals)
            buffered_rows.append(goals_row)
            summary["GOALS_OU"]["count"] += 1
            summary["GOALS_OU"]["hits"] += goals_row[10]
            if goals_row[18] is not None and goals_row[17] is not None:
                summary["GOALS_OU"]["mae_total"] += abs(goals_row[17] - goals_row[18])

            corners_prediction = predict_total_corners(fixture_id)
            actual_corners = float(row["total_corners"]) if int(row["ft_stats_count"] or 0) > 0 else None
            if actual_corners is not None:
                corners_row = _build_ou_prediction_row(simulation_id, fixture_id, "CORNERS_OU", "Corners O/U 9.5", corners_prediction, actual_corners)
                buffered_rows.append(corners_row)
                summary["CORNERS_OU"]["count"] += 1
                summary["CORNERS_OU"]["hits"] += corners_row[10]
                if corners_row[18] is not None and corners_row[17] is not None:
                    summary["CORNERS_OU"]["mae_total"] += abs(corners_row[17] - corners_row[18])

            cards_prediction = predict_total_cards(fixture_id)
            actual_cards = float(row["total_cards"]) if int(row["ft_stats_count"] or 0) > 0 else None
            if actual_cards is not None:
                cards_row = _build_ou_prediction_row(simulation_id, fixture_id, "CARDS_OU", "Cards O/U 4.5", cards_prediction, actual_cards)
                buffered_rows.append(cards_row)
                summary["CARDS_OU"]["count"] += 1
                summary["CARDS_OU"]["hits"] += cards_row[10]
                if cards_row[18] is not None and cards_row[17] is not None:
                    summary["CARDS_OU"]["mae_total"] += abs(cards_row[17] - cards_row[18])

            is_checkpoint = (index + 1) % 10 == 0 or (index + 1) == total_matches
            if is_checkpoint:
                _flush_results(conn, buffered_rows)
                buffered_rows = []

                current_month = pd.to_datetime(row["date"]).strftime("%Y-%m")
                _update_simulation(
                    conn,
                    simulation_id,
                    completed_months=index + 1,
                    current_month=current_month,
                    last_heartbeat=datetime.utcnow(),
                )

        summary_metrics = {
            "accuracy": summary["FT_1X2"]["hits"] / summary["FT_1X2"]["count"] if summary["FT_1X2"]["count"] else None,
            "log_loss": _safe_log_loss(ft_labels, ft_probability_rows),
            "brier_score": _safe_brier(ft_labels, ft_probability_rows),
            "matches_processed": total_matches,
            "result_rows": sum(v["count"] for v in summary.values()),
            "completed_at": _utc_now(),
            "runner": "season_simulation_runner_v2_multi_market",
            "horizon_type": horizon_type,
            "markets": {
                "FT_1X2": {
                    "count": summary["FT_1X2"]["count"],
                    "accuracy": summary["FT_1X2"]["hits"] / summary["FT_1X2"]["count"] if summary["FT_1X2"]["count"] else None,
                    "log_loss": _safe_log_loss(ft_labels, ft_probability_rows),
                    "brier_score": _safe_brier(ft_labels, ft_probability_rows),
                },
                "HT_1X2": {
                    "count": summary["HT_1X2"]["count"],
                    "accuracy": summary["HT_1X2"]["hits"] / summary["HT_1X2"]["count"] if summary["HT_1X2"]["count"] else None,
                    "log_loss": _safe_log_loss(ht_labels, ht_probability_rows),
                    "brier_score": _safe_brier(ht_labels, ht_probability_rows),
                },
                "GOALS_OU": {
                    "count": summary["GOALS_OU"]["count"],
                    "hit_rate": summary["GOALS_OU"]["hits"] / summary["GOALS_OU"]["count"] if summary["GOALS_OU"]["count"] else None,
                    "mae_total": summary["GOALS_OU"]["mae_total"] / summary["GOALS_OU"]["count"] if summary["GOALS_OU"]["count"] else None,
                },
                "CORNERS_OU": {
                    "count": summary["CORNERS_OU"]["count"],
                    "hit_rate": summary["CORNERS_OU"]["hits"] / summary["CORNERS_OU"]["count"] if summary["CORNERS_OU"]["count"] else None,
                    "mae_total": summary["CORNERS_OU"]["mae_total"] / summary["CORNERS_OU"]["count"] if summary["CORNERS_OU"]["count"] else None,
                },
                "CARDS_OU": {
                    "count": summary["CARDS_OU"]["count"],
                    "hit_rate": summary["CARDS_OU"]["hits"] / summary["CARDS_OU"]["count"] if summary["CARDS_OU"]["count"] else None,
                    "mae_total": summary["CARDS_OU"]["mae_total"] / summary["CARDS_OU"]["count"] if summary["CARDS_OU"]["count"] else None,
                },
            },
        }

        _update_simulation(
            conn,
            simulation_id,
            status="COMPLETED",
            stage="FINISHED",
            completed_months=total_matches,
            total_months=total_matches,
            summary_metrics_json=json.dumps(summary_metrics),
            last_heartbeat=datetime.utcnow(),
        )
    except Exception as exc:
        conn.rollback()
        _update_simulation(
            conn,
            simulation_id,
            status="FAILED",
            stage="ERROR",
            error_log=str(exc),
            last_heartbeat=datetime.utcnow(),
        )
        raise
    finally:
        conn.close()
