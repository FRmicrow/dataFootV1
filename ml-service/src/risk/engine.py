import os
import json
from db_config import get_connection

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

def get_db_connection():
    return get_connection()

def save_risk_data(cur, query, fixture_id, market_type, data, key):
    """Helper to parse probabilities and save to DB if data exists."""
    if key in data:
        for sel, prob in data[key].items():
            if prob > 0:
                cur.execute(query, (fixture_id, market_type, sel, float(prob), 1.0 / prob))

def extract_and_save_fair_odds(fixture_id):
    """
    Reads submodel JSONs for a fixture_id, generates fair odds, 
    and saves them to V3_Risk_Analysis.
    """
    conn = get_db_connection()
    
    # Mapping model types to market identifiers and their corresponding JSON keys
    MODEL_CONFIGS = {
        'FT_RESULT': ('1N2_FT', 'probabilities_1n2'),
        'HT_RESULT': ('1N2_HT', 'probabilities_1n2'),
        'CORNERS_TOTAL': ('CORNERS_OU', 'over_under_probabilities'),
        'CARDS_TOTAL': ('CARDS_OU', 'over_under_probabilities'),
        'GOALS_TOTAL': ('GOALS_OU', 'over_under_probabilities'),
    }

    try:
        cur = conn.cursor()
        # Fetch all submodel outputs for this fixture
        query = "SELECT model_type, prediction_json FROM V3_Submodel_Outputs WHERE fixture_id = %s"
        cur.execute(query, (fixture_id,))
        rows = cur.fetchall()
        
        insert_query = """
            INSERT INTO V3_Risk_Analysis 
            (fixture_id, market_type, selection, ml_probability, fair_odd, analyzed_at)
            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT(fixture_id, market_type, selection) 
            DO UPDATE SET 
                ml_probability=excluded.ml_probability, 
                fair_odd=excluded.fair_odd, 
                analyzed_at=CURRENT_TIMESTAMP;
        """
        
        for model_type, json_str in rows:
            if model_type not in MODEL_CONFIGS:
                continue
                
            data = json.loads(json_str)
            if data.get("prediction_status") != "success_model" or data.get("is_fallback", False):
                continue
            market_type, data_key = MODEL_CONFIGS[model_type]
            save_risk_data(cur, insert_query, fixture_id, market_type, data, data_key)
            
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"Error in risk engine for fixture {fixture_id}: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        f_id = int(sys.argv[1])
        extract_and_save_fair_odds(f_id)
        print(f"✅ Risk Analysis complete for fixture {f_id}")
