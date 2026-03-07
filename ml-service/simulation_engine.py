import psycopg2
import psycopg2.extras
import pandas as pd
import numpy as np
import json
import os
import sys
import logging
import joblib
from datetime import datetime
from time_travel import TemporalFeatureFactory
from typing import Dict, Any, List
from db_config import get_connection

import logging
import warnings

# Suppress annoying and performance-heavy Scikit-Learn feature name warnings during tight inference loops
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('LeagueReplayEngine')

class LeagueReplayEngine:
    """
    US_182: League Replay Engine
    Chronologically iterates through a season and generates leak-proof inferences.
    """
    def __init__(self, model_path: str = None, simulation_id: int = None):
        self.factory = TemporalFeatureFactory()
        self.simulation_id = simulation_id
        self.model = None
        if model_path and os.path.exists(model_path):
            self.model = joblib.load(model_path)
            logger.info(f"Loaded model from {model_path}")

    def get_connection(self):
        return get_connection(use_dict_cursor=True)

    def run_replay(self, league_id: int, season_year: int, start_date: str = None, end_date: str = None):
        """
        Main execution loop for a league/season replay.
        """
        if not self.model:
            raise ValueError("Model not loaded. Simulation cannot run.")
        if not self.simulation_id:
            raise ValueError("Simulation ID not set.")

        conn = self.get_connection()
        # psycopg2 with RealDictCursor gives dict-like rows (replaces sqlite3.Row)
        
        try:
            # 1. Update Simulation Status to RUNNING
            cur = conn.cursor()
            cur.execute("UPDATE V3_Forge_Simulations SET status = 'RUNNING' WHERE id = %s", (self.simulation_id,))
            cur.close()
            conn.commit()

            # 2. Fetch Fixtures
            query = """
                SELECT fixture_id, date, home_team_id, away_team_id, goals_home, goals_away, status_short, round
                FROM V3_Fixtures
                WHERE league_id = %s AND season_year = %s
            """
            params = [league_id, season_year]
            if start_date:
                query += " AND date >= %s"
                params.append(start_date)
            if end_date:
                query += " AND date <= %s"
                params.append(end_date)
            
            query += " AND status_short IN ('FT', 'AET', 'PEN') ORDER BY date ASC"
            
            fixtures = pd.read_sql_query(query, conn, params=params)
            total = len(fixtures)
            
            if total == 0:
                logger.warning(f"No matches found for League {league_id} Season {season_year}")
                return

            logger.info(f"🚀 Starting Replay for Simulation {self.simulation_id}: {total} matches.")

            # 3. Process matches day-by-day (or in chunks)
            results_buffer = []
            for idx, row in fixtures.iterrows():
                fid = int(row['fixture_id'])
                
                # US_181: Time-Travel Vector Generation
                vector_dict = self.factory.get_vector(fid, conn=conn)
                
                # Standardized order for prediction
                # Current 1X2 model expects these features (must match TemporalFeatureFactory.feature_columns)
                features_ordered = [vector_dict[col] for col in self.factory.feature_columns]
                
                # Model Inference
                probs = self.model.predict_proba([features_ordered])[0]
                # Random Forest order usually [X, 1, 2] if classes are [0, 1, 2]
                classes = self.model.classes_
                prob_map = {int(c): float(p) for c, p in zip(classes, probs)}
                
                p_h = prob_map.get(1, 0.33)
                p_x = prob_map.get(0, 0.33)
                p_a = prob_map.get(2, 0.33)
                
                # Determine Prediction Outcome
                pred_winner = 1 if p_h > p_x and p_h > p_a else (2 if p_a > p_h and p_a > p_x else 0)
                actual_winner = 1 if row['goals_home'] > row['goals_away'] else (2 if row['goals_away'] > row['goals_home'] else 0)
                is_correct = 1 if pred_winner == actual_winner else 0
                
                # Store in buffer
                results_buffer.append((
                    self.simulation_id, fid, p_h, p_x, p_a, 
                    f"{int(row['goals_home'])}-{int(row['goals_away'])}",
                    actual_winner, is_correct
                ))
                
                # Progress Update every 10 matches (approx one matchday)
                if (idx + 1) % 10 == 0 or (idx + 1) == total:
                    self._flush_results(conn, results_buffer)
                    results_buffer = []
                    
                    progress_pct = int(((idx + 1) / total) * 100)
                    curr_month = str(row['date']).split('T')[0][:7]  # YYYY-MM
                    
                    upd_cur = conn.cursor()
                    upd_cur.execute("""
                        UPDATE V3_Forge_Simulations 
                        SET completed_months = %s, current_month = %s
                        WHERE id = %s
                    """, (idx + 1, curr_month, self.simulation_id))
                    upd_cur.close()
                    conn.commit()
                    
                    # Log progress for US_190 Telemetry
                    print(f"PROGRESS: {progress_pct}% | Match {idx+1}/{total} | Month: {curr_month}")
                    print(f"HEARTBEAT: {progress_pct}")
                    sys.stdout.flush()

            logger.info(f"✅ Replay completed for simulation {self.simulation_id}")

        except Exception as e:
            logger.error(f"Simulation {self.simulation_id} failed: {e}")
            err_cur = conn.cursor()
            err_cur.execute("UPDATE V3_Forge_Simulations SET status = 'FAILED' WHERE id = %s", (self.simulation_id,))
            err_cur.close()
            conn.commit()
            raise
        finally:
            conn.close()

    def _flush_results(self, conn, results):
        """Saves a batch of results to V3_Forge_Results."""
        sql = """
            INSERT INTO V3_Forge_Results 
            (simulation_id, fixture_id, prob_home, prob_draw, prob_away, predicted_score, actual_winner, is_correct)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT(simulation_id, fixture_id) DO UPDATE SET 
            prob_home=EXCLUDED.prob_home, prob_draw=EXCLUDED.prob_draw, prob_away=EXCLUDED.prob_away,
            actual_winner=EXCLUDED.actual_winner, is_correct=EXCLUDED.is_correct
        """
        cur = conn.cursor()
        cur.executemany(sql, results)
        cur.close()

if __name__ == "__main__":
    # Test execution
    # engine = LeagueReplayEngine(simulation_id=1, model_path='model_1x2.joblib')
    # engine.run_replay(league_id=61, season_year=2023)
    pass
