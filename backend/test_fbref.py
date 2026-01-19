import soccerdata as sd
import json
import sys
import pandas as pd

try:
    # Create a scraper class instance for the 2020/21 Premier League
    fbref = sd.FBref('ENG-Premier League', '2021')

    # Fetch data (standard player stats)
    # We use standard because standard stats are usually the core ones (goals, assists, matches)
    player_season_stats = fbref.read_player_season_stats(stat_type="standard")

    # The result is a multi-index DataFrame. Let's flatten it.
    df = player_season_stats.reset_index()
    
    # Flatten multi-index columns if they exist
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ['_'.join(col).strip() if isinstance(col, tuple) else col for col in df.columns]
    
    # Convert all values to standard types (no numpy types)
    sample_df = df.head(5)
    data = []
    for _, row in sample_df.iterrows():
        record = {}
        for col, val in row.items():
            # Handle numpy types
            if hasattr(val, 'item'):
                record[col] = val.item()
            elif pd.isna(val):
                record[col] = None
            else:
                record[col] = val
        data.append(record)
    
    print(json.dumps(data, indent=2))

except Exception as e:
    import traceback
    print(f"Error: {str(e)}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
