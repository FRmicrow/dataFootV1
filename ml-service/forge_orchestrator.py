"""
Forge Orchestrator (V8) — Sequential Simulation Pipeline
Manages: Model Selection → Training → Prediction → Evaluation
NO ODDS. KPI = Accuracy Rate.
"""
import psycopg2
from db_config import get_connection
import pandas as pd
import os
import sys
import logging
import json
import joblib
from datetime import datetime
from simulation_engine import LeagueReplayEngine
from analytics import ForgeAnalytics
from train_forge import train_model

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger('ForgeOrchestrator')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')

class ForgeOrchestrator:
    """
    V8 Forge Orchestrator: Selection → Training → Prediction → Evaluation.
    Manages the lifecycle of a simulation run.
    """
    def __init__(self, analytics=None):
        self.analytics = analytics or ForgeAnalytics()

    def get_connection(self):
        return get_connection()

    def start_simulation(self, league_id: int, season_year: int, mode: str = 'STATIC', horizon: str = 'FULL_HISTORICAL', sim_id: int = None):
        """
        Starts a simulation with horizon support.
        """
        print(f"STAGE: INITIALIZING")
        print("HEARTBEAT: 1")
        sys.stdout.flush()
        
        conn = self.get_connection()
        cur = conn.cursor()
        
        # 1. Determine the Model to use
        model_id = None
        model_path = None
        
        # Lookup the most recent active model for this league/horizon
        cur.execute("""
            SELECT id, model_path FROM V3_Model_Registry 
            WHERE league_id = %s AND horizon_type = %s AND is_active = 1
            ORDER BY id DESC LIMIT 1
        """, (league_id, horizon))
        row = cur.fetchone()
        
        if row:
            model_id, model_path = row
            # Verify model file still exists
            if model_path and os.path.exists(model_path):
                logger.info(f"✅ Using existing model: {model_path} (ID: {model_id})")
            else:
                logger.warning(f"⚠️ Model file not found at {model_path}. Re-training...")
                model_path = None
        
        if not model_path:
            print(f"STAGE: TRAINING_MODELS")
            print("HEARTBEAT: 1")
            sys.stdout.flush()
            # Train a new model
            logger.info(f"⚠️ No active {horizon} model found for league {league_id}. Training now...")
            
            model_path = train_model(
                league_id=league_id, 
                horizon_type=horizon,
                season_year=season_year
            )
            
            if model_path:
                cur.execute("SELECT id FROM V3_Model_Registry WHERE model_path = %s LIMIT 1", (model_path,))
                row = cur.fetchone()
                if row: model_id = row[0]
            else:
                # Last resort: try global model
                global_model_path = os.path.join(BASE_DIR, 'model_1x2.joblib')
                if os.path.exists(global_model_path):
                    logger.warning("⚠️ Using global fallback model.")
                    model_path = global_model_path
                else:
                    error_msg = "No valid model available. Cannot run simulation."
                    logger.error(f"❌ {error_msg}")
                    if sim_id:
                        cur.execute("UPDATE V3_Forge_Simulations SET status = 'FAILED', error_log = %s, stage = 'ERROR' WHERE id = %s", (error_msg, sim_id))
                        conn.commit()
                    print(f"PROGRESS: 0% | FAILED: {error_msg}")
                    sys.stdout.flush()
                    return

        # 2. Assign or Create Simulation Entry
        if sim_id:
            logger.info(f"📍 Using provided Simulation ID: {sim_id}")
            cur.execute("""
                UPDATE V3_Forge_Simulations SET model_id = %s, status = 'RUNNING', stage = 'PREPARING' 
                WHERE id = %s
            """, (model_id, sim_id))
        else:
            cur.execute("""
                INSERT INTO V3_Forge_Simulations (league_id, season_year, model_id, status, horizon_type, stage)
                VALUES (%s, %s, %s, 'RUNNING', %s, 'PREPARING')
                RETURNING id
            """, (league_id, season_year, model_id, horizon, 'PREPARING'))
            sim_id = cur.fetchone()[0]
        
        conn.commit()
        conn.close()
        
        logger.info(f"🆕 Active Simulation ID: {sim_id} | League {league_id} | Season {season_year} | Horizon: {horizon}")
        print("HEARTBEAT: 1")
        sys.stdout.flush()
        
        try:
            if mode == 'STATIC':
                print(f"STAGE: RUNNING_SIM")
                sys.stdout.flush()
                engine = LeagueReplayEngine(self.db_path, model_path, simulation_id=sim_id)
                engine.run_replay(league_id, season_year)
            elif mode == 'WALK_FORWARD':
                print(f"STAGE: WALK_FORWARD_LOOP")
                sys.stdout.flush()
                self._run_walk_forward_simulation(sim_id, league_id, season_year, horizon)
            else:
                raise ValueError(f"Unknown mode: {mode}")
                
            # Final Settlement
            print(f"STAGE: CALIBRATING_METRICS")
            print("HEARTBEAT: 1")
            sys.stdout.flush()
            self.analytics.settle_simulation(sim_id)
            
            # Final Success Update
            conn = self.get_connection()
            cur = conn.cursor()
            cur.execute("UPDATE V3_Forge_Simulations SET status = 'COMPLETED', stage = 'FINISHED' WHERE id = %s", (sim_id,))
            conn.commit()
            conn.close()
            
            logger.info(f"🏆 Forge Run {sim_id} Complete!")
            sys.stdout.flush()
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Forge Run {sim_id} Failed: {error_msg}")
            import traceback
            traceback.print_exc()
            conn = self.get_connection()
            cur = conn.cursor()
            cur.execute("UPDATE V3_Forge_Simulations SET status = 'FAILED', error_log = %s, stage = 'ERROR' WHERE id = %s", (error_msg, sim_id))
            conn.commit()
            conn.close()

    def _run_walk_forward_simulation(self, sim_id: int, league_id: int, season_year: int, horizon: str):
        """
        Walk-Forward: Monthly rolling retraining with fixed horizon window.
        """
        logger.info(f"🌀 Walk-Forward for Sim {sim_id} [{horizon}]...")
        sys.stdout.flush()
        
        conn = self.get_connection()
        query = """
            SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') as month 
            FROM V3_Fixtures 
            WHERE league_id = %s AND season_year = %s AND status_short IN ('FT','AET','PEN')
            ORDER BY month ASC
        """
        months = pd.read_sql_query(query, conn, params=(league_id, season_year))['month'].tolist()
        conn.close()
        
        if not months:
            raise ValueError("No months found to simulate.")
            
        for i, month in enumerate(months):
            logger.info(f"--- [Month {i+1}/{len(months)}: {month}] ---")
            
            # Recalibrate model at the start of each month
            cutoff_d = f"{month}-01"
            specialized_model_path = train_model(
                league_id=league_id, 
                cutoff_date=cutoff_d, 
                horizon_type=horizon,
                season_year=season_year
            )
            
            if not specialized_model_path:
                # Fallback to the initial model assigned to simulation
                conn = self.get_connection()
                cur = conn.cursor()
                cur.execute("""
                    SELECT r.model_path FROM V3_Model_Registry r 
                    JOIN V3_Forge_Simulations s ON r.id = s.model_id 
                    WHERE s.id = %s
                """, (sim_id,))
                row = cur.fetchone()
                conn.close()
                if row:
                    specialized_model_path = row[0]
                else:
                    specialized_model_path = os.path.join(BASE_DIR, 'model_1x2.joblib')
                logger.warning("   ⚠️ Retraining failed. Falling back to initial model.")

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
    parser = argparse.ArgumentParser(description='Forge Orchestrator V8')
    parser.add_argument('--league', type=int, required=True, help='League ID')
    parser.add_argument('--season', type=int, required=True, help='Season Year')
    parser.add_argument('--mode', type=str, default='STATIC', choices=['STATIC', 'WALK_FORWARD'])
    parser.add_argument('--horizon', type=str, default='FULL_HISTORICAL', 
                        choices=['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING'])
    parser.add_argument('--sim_id', type=int, help='Pre-existing Simulation ID')
    
    args = parser.parse_args()
    
    orchestrator = ForgeOrchestrator()
    orchestrator.start_simulation(args.league, args.season, mode=args.mode, horizon=args.horizon, sim_id=args.sim_id)
