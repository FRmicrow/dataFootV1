import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
REPORT_PATH = BASE_DIR / "reports" / "global_1x2_horizon_report.json"
OUTPUT_PATH = BASE_DIR / "reports" / "global_1x2_horizon_recommendation.json"


def score_row(row):
    metrics = row.get("metrics") or {}
    log_loss = metrics.get("log_loss")
    brier = metrics.get("brier_score")
    accuracy = metrics.get("accuracy")
    if log_loss is None or brier is None or accuracy is None:
        return None
    return (-log_loss, -brier, accuracy)


def main():
    rows = json.loads(REPORT_PATH.read_text())
    candidates = [row for row in rows if row.get("metrics")]
    ranked = sorted(candidates, key=score_row, reverse=True)

    recommendation = {
        "ranked_horizons": ranked,
        "recommended_active_horizon": ranked[0]["horizon"] if ranked else None,
    }
    OUTPUT_PATH.write_text(json.dumps(recommendation, indent=2))
    print(json.dumps(recommendation, indent=2))


if __name__ == "__main__":
    main()
