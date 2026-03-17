import pandas as pd
import json
import os
import sys


MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
ML_SERVICE_ROOT = os.path.abspath(os.path.join(MODEL_DIR, "..", "..", ".."))
if ML_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, ML_SERVICE_ROOT)

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, normalize_feature_vector


def get_db_connection():
    return get_connection()


def fetch_goals_dataset():
    """
    Fetches the dataset for GOALS_OU modeling from the enriched feature store.
    Targets are full-time home and away goals.
    """
    conn = get_db_connection()
    try:
        query = """
            SELECT
                f.fixture_id,
                f.league_id,
                f.date AS match_date,
                f.goals_home,
                f.goals_away,
                fs.feature_vector
            FROM V3_Fixtures f
            JOIN V3_ML_Feature_Store fs ON f.fixture_id = fs.fixture_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND f.goals_home IS NOT NULL
              AND f.goals_away IS NOT NULL
            ORDER BY f.date ASC
        """
        df = pd.read_sql_query(query, conn)
        df['match_date'] = pd.to_datetime(df['match_date'], utc=True)
        df['goals_home'] = pd.to_numeric(df['goals_home'], errors='coerce')
        df['goals_away'] = pd.to_numeric(df['goals_away'], errors='coerce')
        df = df.dropna(subset=['goals_home', 'goals_away']).copy()

        raw_features = df['feature_vector'].apply(json.loads).tolist()
        feature_frame = pd.DataFrame(
            [normalize_feature_vector(vector) for vector in raw_features],
            columns=GLOBAL_1X2_FEATURE_COLUMNS
        )

        df = pd.concat([df.drop(columns=['feature_vector']), feature_frame], axis=1)
        df['target_home_goals'] = df['goals_home'].astype(int)
        df['target_away_goals'] = df['goals_away'].astype(int)
        return df
    finally:
        conn.close()


if __name__ == "__main__":
    dataset = fetch_goals_dataset()
    print(f"✅ Goals Dataset ready: {dataset.shape[0]} matches")
