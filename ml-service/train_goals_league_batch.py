import argparse
import json

from train_goals_league import train_league_goals_model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--league-ids", nargs="+", type=int, required=True)
    parser.add_argument("--horizon", default="FULL_HISTORICAL", choices=["FULL_HISTORICAL", "5Y_ROLLING", "3Y_ROLLING"])
    parser.add_argument("--no-activate", action="store_true")
    args = parser.parse_args()

    results = []
    for league_id in args.league_ids:
        try:
            train_league_goals_model(league_id, horizon_type=args.horizon, activate=not args.no_activate)
            results.append({"league_id": league_id, "status": "completed"})
        except Exception as exc:
            results.append({"league_id": league_id, "status": "failed", "error": str(exc)})

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
