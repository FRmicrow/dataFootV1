import os
import json
from db_config import get_connection

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

def get_db_connection():
    return get_connection()

def extract_and_save_fair_odds(fixture_id):
    """
    Reads submodel JSONs for a fixture_id, generates fair odds, 
    and saves them to V3_Risk_Analysis.
    """
    conn = get_db_connection()
    try:
        # Fetch all submodel outputs for this fixture
        query = "SELECT model_type, prediction_json FROM V3_Submodel_Outputs WHERE fixture_id = ?"
        rows = conn.execute(query, (fixture_id,)).fetchall()
        
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
            data = json.loads(json_str)
            
            if model_type == 'FT_RESULT':
                if 'probabilities_1n2' in data:
                    probs = data['probabilities_1n2']
                    for sel, prob in probs.items():
                        if prob > 0:
                            conn.execute(insert_query, (fixture_id, '1N2_FT', sel, float(prob), 1.0 / prob))
                            
            elif model_type == 'HT_RESULT':
                 if 'probabilities_1n2' in data:
                    probs = data['probabilities_1n2']
                    for sel, prob in probs.items():
                        if prob > 0:
                            conn.execute(insert_query, (fixture_id, '1N2_HT', sel, float(prob), 1.0 / prob))
                            
            elif model_type == 'CORNERS_TOTAL':
                if 'over_under_probabilities' in data:
                    probs = data['over_under_probabilities']
                    for sel, prob in probs.items():
                        if prob > 0:
                            conn.execute(insert_query, (fixture_id, 'CORNERS_OU', sel, float(prob), 1.0 / prob))
                            
            elif model_type == 'CARDS_TOTAL':
                if 'over_under_probabilities' in data:
                    probs = data['over_under_probabilities']
                    for sel, prob in probs.items():
                        if prob > 0:
                            conn.execute(insert_query, (fixture_id, 'CARDS_OU', sel, float(prob), 1.0 / prob))
                            
        conn.commit()
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
