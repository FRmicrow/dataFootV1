import sqlite3
import pd as pd
import pandas as pd
import os
import sys
import logging
import json
import joblib
from datetime import datetime
from simulation_engine import LeagueReplayEngine
from analytics import ForgeAnalytics
from train_1x2 import train_model

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger('ForgeOrchestrator')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'backend', 'database.sqlite'))
MODELS_DIR = os.path.join(BASE_DIR, 'models')

class ForgeOrchestrator:
    """
    US_189 / V9 Rebuild: Sequential Orchestrator
    Manages the lifecycle: Selection -> Training -> Prediction -> Evaluation.
    """
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.analytics = ForgeAnalytics(db_path)

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def start_simulation(self, league_id: int, season_year: int, mode: str = 'STATIC', horizon: str = 'FULL_HISTORICAL'):
        """
        Starts a simulation with horizon support.
        """
        conn = self.get_connection()
        cur = conn.cursor()
        
        # 1. Determine the Model to use
        model_id = None
        model_path = None
        
        # Lookup the most recent active model for this league/horizon
        cur.execute("""
            SELECT id, model_path FROM V3_Model_Registry 
            WHERE league_id IS ? AND horizon_type = ? AND is_active = 1
            ORDER BY id DESC LIMIT 1
        """, (league_id, horizon))
        row = cur.fetchone()
        
        if row:
            model_id, model_path = row
        else:
            # If no model exists, we MUST train one first (US_211)
            logger.info(f"⚠️ No active {horizon} model found for league {league_id}. Triggering training...")
            model_path = train_model(league_id=league_id, horizon_type=horizon)
            if model_path:
                # Re-query to get the newly created model_id
                cur.execute("SELECT id FROM V3_Model_Registry WHERE model_path = ? LIMIT 1", (model_path,))
                row = cur.fetchone()
                if row: model_id = row[0]
            else:
                logger.error("❌ Failed to establish a valid model for simulation.")
                return

        # 2. Create/Update Simulation Entry
        # We check if a simulation already exists for this config to avoid duplicates
        cur.execute("""
            INSERT INTO V3_Forge_Simulations (league_id, season_year, model_id, status, horizon_type)
            VALUES (?, ?, ?, 'PENDING', ?)
        """, (league_id, season_year, model_id, horizon))
        sim_id = cur.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"🆕 Created Simulation ID: {sim_id} for League {league_id} Season {season_year} (Model: {model_id}, Horizon: {horizon})")
        sys.stdout.flush()
        
        try:
            if mode == 'STATIC':
                engine = LeagueReplayEngine(self.db_path, model_path, simulation_id=sim_id)
                engine.run_replay(league_id, season_year)
            elif mode == 'WALK_FORWARD':
                self._run_walk_forward_simulation(sim_id, league_id, season_year, horizon)
            else:
                raise ValueError(f"Unknown mode: {mode}")
                
            # Final Settlement (US_Accuracy mandate)
            self.analytics.settle_simulation(sim_id)
            logger.info(f"🏆 Forge Run {sim_id} Complete!")
            sys.stdout.flush()
            
        except Exception as e:
            logger.error(f"❌ Forge Run {sim_id} Failed: {e}")
            conn = self.get_connection()
            conn.execute("UPDATE V3_Forge_Simulations SET status = 'FAILED' WHERE id = ?", (sim_id,))
            conn.commit()
            conn.close()

    def _run_walk_forward_simulation(self, sim_id: int, league_id: int, season_year: int, horizon: str):
        """
        US_189: Monthly rolling retraining with fixed horizon window.
        """
        logger.info(f"🌀 Starting Walk-Forward Orchestration for Sim {sim_id} [{horizon}]...")
        sys.stdout.flush()
        
        conn = self.get_connection()
        query = "SELECT DISTINCT strftime('%Y-%m', date) as month FROM V3_Fixtures WHERE league_id = ? AND season_year = ? ORDER BY month ASC"
        months = pd.read_sql_query(query, conn, params=(league_id, season_year))['month'].tolist()
        conn.close()
        
        if not months:
            raise ValueError("No months found to simulate.")
            
        for month in months:
            logger.info(f"--- [Month {month}] ---")
            
            # Recalibrate model at the start of each month
            cutoff_d = f"{month}-01"
            specialized_model_path = train_model(league_id=league_id, cutoff_date=cutoff_d, horizon_type=horizon)
            
            if not specialized_model_path:
                 # Fallback to the initial model assigned to simulation
                 conn = self.get_connection()
                 row = conn.execute("SELECT model_path FROM V3_Model_Registry r JOIN V3_Forge_Simulations s ON r.id = s.model_id WHERE s.id = ?", (sim_id,)).fetchone()
                 conn.close()
                 specialized_model_path = row[0]
                 logger.warning("   ⚠️  Retraining failed (likely no data). Falling back to initial model.")

            # Predict the month
            start_d = cutoff_d
            year, m = map(int, month.split('-'))
            next_m = m + 1 if m < 12 else 1
            next_y = year if m < 12 else year + 1
            end_d = f"{next_y}-{next_m:02d}-01"
            
            engine = LeagueReplayEngine(self.db_path, specialized_model_path, simulation_id=sim_id)
            engine.run_replay(league_id, season_year, start_date=start_d, end_date=end_d)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Forge Orchestrator V9')
    parser.add_argument('--league', type=int, required=True, help='League ID')
    parser.add_argument('--season', type=int, required=True, help='Season Year')
    parser.add_argument('--mode', type=str, default='STATIC', choices=['STATIC', 'WALK_FORWARD'])
    parser.add_argument('--horizon', type=str, default='FULL_HISTORICAL', 
                        choices=['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING'])
    
    args = parser.parse_args()
    
    orchestrator = ForgeOrchestrator()
    orchestrator.start_simulation(args.league, args.season, mode=args.mode, horizon=args.horizon)
