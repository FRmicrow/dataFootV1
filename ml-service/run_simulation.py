import argparse
import sys
import os
import json
from simulation_engine import LeagueReplayEngine

def main():
    parser = argparse.ArgumentParser(description='Historical League Simulation Engine')
    parser.add_argument('--league_id', type=int, required=True, help='ID of league to simulate')
    parser.add_argument('--start_date', type=str, required=True, help='Start Date YYYY-MM-DD')
    parser.add_argument('--end_date', type=str, required=True, help='End Date YYYY-MM-DD')
    parser.add_argument('--model_id', type=int, default=1, help='Model ID for recording predictions')
    
    args = parser.parse_args()
    
    # Path configuration
    db_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'database.sqlite')
    model_path = os.path.join(os.path.dirname(__file__), 'model_1x2.joblib')
    
    print(f"PROGRESS: 5%")
    print(f"Initializing Simulation Engine for League:{args.league_id} Model:{args.model_id}")
    
    engine = LeagueReplayEngine(db_path, model_path, target_model_id=args.model_id)
    
    print(f"PROGRESS: 10%")
    # Run Simulation
    metrics = engine.replay_season(
        league_id=args.league_id,
        start_date=args.start_date,
        end_date=args.end_date
    )
    
    print(f"PROGRESS: 100%")
    print("SIMULATION_COMPLETE")
    print(json.dumps(metrics, indent=2))

if __name__ == '__main__':
    main()
