import soccerdata as sd
import json
import sys
import pandas as pd
import argparse

def flatten_df(df):
    """Flatten multi-index columns and handle types for JSON export."""
    df = df.reset_index()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ['_'.join(col).strip().replace(' ', '_') if isinstance(col, tuple) else col for col in df.columns]
    
    data = []
    for _, row in df.iterrows():
        record = {}
        for col, val in row.items():
            if hasattr(val, 'item'): # numpy types
                record[col] = val.item()
            elif pd.isna(val):
                record[col] = None
            else:
                record[col] = val
        data.append(record)
    return data

def main():
    parser = argparse.ArgumentParser(description='SoccerData FBref Bridge')
    parser.add_argument('--league', required=True, help='League ID (e.g. ENG-Premier League)')
    parser.add_argument('--season', required=True, help='Season year (e.g. 2021)')
    parser.add_argument('--type', choices=['players', 'teams', 'schedule'], default='players', help='Data type to fetch')
    
    args = parser.parse_args()
    
    try:
        fbref = sd.FBref(args.league, args.season)
        
        if args.type == 'players':
            df = fbref.read_player_season_stats(stat_type="standard")
        elif args.type == 'teams':
            df = fbref.read_team_season_stats(stat_type="standard")
        elif args.type == 'schedule':
            df = fbref.read_schedule()
        else:
            print(json.dumps({"error": "Unknown type"}), file=sys.stderr)
            sys.exit(1)
            
        result = flatten_df(df)
        print(json.dumps(result))

    except Exception as e:
        import traceback
        print(f"Error: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
