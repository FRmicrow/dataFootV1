import os
import json
from db_config import get_connection
import traceback

# Import our four submodels
from src.models.ft_result.inference import predict_ft_result
from src.models.ht_result.inference import predict_ht_result
from src.models.corners_total.inference import predict_total_corners
from src.models.cards_total.inference import predict_total_cards

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

def get_db_connection():
    return get_connection()

def save_to_submodel_outputs(fixture_id, model_type, prediction_dict):
    """
    Saves the JSON prediction to V3_Submodel_Outputs, overwriting if it exists.
    """
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        # Get team_id context so it's queryable. We only need home_team_id representing the fixture.
        fixture_query = "SELECT home_team_id FROM V3_Fixtures WHERE fixture_id = %s"
        cur.execute(fixture_query, (fixture_id,))
        row = cur.fetchone()
        team_id = row[0] if row else 0
        
        json_str = json.dumps(prediction_dict)
        
        query = """
            INSERT INTO V3_Submodel_Outputs (fixture_id, team_id, model_type, prediction_json, calculated_at)
            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT(fixture_id, team_id, model_type) 
            DO UPDATE SET prediction_json=excluded.prediction_json, calculated_at=CURRENT_TIMESTAMP;
        """
        cur.execute(query, (fixture_id, team_id, model_type, json_str))
        conn.commit()
        cur.close()
    except Exception as e:
        print(f"Failed to save {model_type} for {fixture_id}: {e}")
    finally:
        conn.close()

def generate_master_prediction(fixture_id):
    """
    Calls all four CatBoost Poisson submodels, aggregates their JSON results,
    saves them to the DB, and returns the master unified dictionary.
    """
    results = {
        "fixture_id": fixture_id,
        "success": True,
        "models": {}
    }
    
    # FT_RESULT
    try:
        res_ft = predict_ft_result(fixture_id)
        results["models"]["FT_RESULT"] = res_ft
        save_to_submodel_outputs(fixture_id, "FT_RESULT", res_ft)
    except Exception as e:
        traceback.print_exc()
        results["models"]["FT_RESULT"] = {"error": str(e)}
        
    # HT_RESULT
    try:
        res_ht = predict_ht_result(fixture_id, version='v0')
        results["models"]["HT_RESULT"] = res_ht
        save_to_submodel_outputs(fixture_id, "HT_RESULT", res_ht)
    except Exception as e:
        results["models"]["HT_RESULT"] = {"error": str(e)}
        
    # CORNERS_TOTAL
    try:
        res_corners = predict_total_corners(fixture_id)
        results["models"]["CORNERS_TOTAL"] = res_corners
        save_to_submodel_outputs(fixture_id, "CORNERS_TOTAL", res_corners)
    except Exception as e:
        results["models"]["CORNERS_TOTAL"] = {"error": str(e)}
        
    # CARDS_TOTAL
    try:
        res_cards = predict_total_cards(fixture_id)
        results["models"]["CARDS_TOTAL"] = res_cards
        save_to_submodel_outputs(fixture_id, "CARDS_TOTAL", res_cards)
    except Exception as e:
        results["models"]["CARDS_TOTAL"] = {"error": str(e)}
        
    # Run Risk Engine (Fair Odds calculations) based on the newly saved outputs
    try:
        from src.risk.engine import extract_and_save_fair_odds
        extract_and_save_fair_odds(fixture_id)
        results["models"]["RISK_ANALYSIS"] = {"success": True, "message": "Fair odds calculated and stored."}
    except Exception as e:
        results["models"]["RISK_ANALYSIS"] = {"error": str(e)}
        
    # If all core models failed, marking orchestrator as failed
    core_models = ["FT_RESULT", "HT_RESULT", "CORNERS_TOTAL", "CARDS_TOTAL"]
    if all("error" in results["models"].get(v, {}) for v in core_models):
        results["success"] = False
        
    return results

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        f_id = int(sys.argv[1])
        master = generate_master_prediction(f_id)
        print(json.dumps(master, indent=2))
