import sqlite3
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

import logging
import warnings

# Suppress annoying and performance-heavy Scikit-Learn feature name warnings during tight inference loops
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('LeagueReplayEngine')

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'database.sqlite'))

class LeagueReplayEngine:
    """
    US_182: League Replay Engine
    Chronologically iterates through a season and generates leak-proof inferences.
    """
    def __init__(self, db_path: str = DB_PATH, model_path: str = None, simulation_id: int = None):
        self.db_path = db_path
        self.factory = TemporalFeatureFactory(db_path)
        self.simulation_id = simulation_id
        self.model = None
        if model_path and os.path.exists(model_path):
            self.model = joblib.load(model_path)
            logger.info(f"Loaded model from {model_path}")

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def run_replay(self, league_id: int, season_year: int, start_date: str = None, end_date: str = None):
        """
        Main execution loop for a league/season replay.
        """
        if not self.model:
            raise ValueError("Model not loaded. Simulation cannot run.")
        if not self.simulation_id:
            raise ValueError("Simulation ID not set.")

        conn = self.get_connection()
        conn.row_factory = sqlite3.Row
        
        try:
            # 1. Update Simulation Status to RUNNING
            conn.execute("UPDATE V3_Forge_Simulations SET status = 'RUNNING' WHERE id = ?", (self.simulation_id,))
            conn.commit()

            # 2. Fetch Fixtures
            query = """
                SELECT fixture_id, date, home_team_id, away_team_id, goals_home, goals_away, status_short, round
                FROM V3_Fixtures
                WHERE league_id = ? AND season_year = ?
            """
            params = [league_id, season_year]
            if start_date:
                query += " AND date >= ?"
                params.append(start_date)
            if end_date:
                query += " AND date <= ?"
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
                    curr_month = row['date'].split('T')[0][:7] # YYYY-MM
                    
                    conn.execute("""
                        UPDATE V3_Forge_Simulations 
                        SET completed_months = ?, current_month = ?
                        WHERE id = ?
                    """, (idx + 1, curr_month, self.simulation_id))
                    conn.commit()
                    
                    # Log progress for US_190 Telemetry
                    print(f"PROGRESS: {progress_pct}% | Match {idx+1}/{total} | Month: {curr_month}")
                    print(f"HEARTBEAT: {progress_pct}")
                    sys.stdout.flush()

            logger.info(f"✅ Replay completed for simulation {self.simulation_id}")

        except Exception as e:
            logger.error(f"Simulation {self.simulation_id} failed: {e}")
            conn.execute("UPDATE V3_Forge_Simulations SET status = 'FAILED' WHERE id = ?", (self.simulation_id,))
            conn.commit()
            raise
        finally:
            conn.close()

    def _flush_results(self, conn, results):
        """Saves a batch of results to V3_Forge_Results."""
        sql = """
            INSERT INTO V3_Forge_Results 
            (simulation_id, fixture_id, prob_home, prob_draw, prob_away, predicted_score, actual_winner, is_correct)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(simulation_id, fixture_id) DO UPDATE SET 
            prob_home=excluded.prob_home, prob_draw=excluded.prob_draw, prob_away=excluded.prob_away,
            actual_winner=excluded.actual_winner, is_correct=excluded.is_correct
        """
        conn.executemany(sql, results)

if __name__ == "__main__":
    # Test execution
    # engine = LeagueReplayEngine(simulation_id=1, model_path='model_1x2.joblib')
    # engine.run_replay(league_id=61, season_year=2023)
    pass
