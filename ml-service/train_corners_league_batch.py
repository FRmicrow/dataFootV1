import argparse
import json

from train_corners_league import train_league_corners_model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--league-ids", nargs="+", type=int, required=True)
    args = parser.parse_args()

    results = []
    for league_id in args.league_ids:
        try:
            train_league_corners_model(league_id)
            results.append({"league_id": league_id, "status": "completed"})
        except Exception as exc:
            results.append({"league_id": league_id, "status": "failed", "error": str(exc)})

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
