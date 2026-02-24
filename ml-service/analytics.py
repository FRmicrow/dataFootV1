import sqlite3
import pandas as pd
import numpy as np
import json
import os
import logging
from typing import Dict, Any, List
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('ForgeAnalytics')

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'database.sqlite'))

class ForgeAnalytics:
    """
    US_183 / V9: Quant Validation & Ledger Settlement
    Focuses on Accuracy, Brier Score, and Log-Loss.
    Mandate: ZERO ROI Logic.
    """
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def settle_simulation(self, simulation_id: int):
        """
        Settles all results for a simulation and calculates summary metrics.
        Now integrates with V3_Quant_Ledger (US_203).
        """
        logger.info(f"📊 Settling Quant Ledger for simulation {simulation_id}...")
        conn = self.get_connection()
        
        try:
            # 1. Fetch Forge Results matched with Actual Outcomes
            query = """
                SELECT 
                    r.fixture_id, r.prob_home, r.prob_draw, r.prob_away,
                    f.goals_home, f.goals_away,
                    CASE 
                        WHEN f.goals_home > f.goals_away THEN 1
                        WHEN f.goals_home < f.goals_away THEN 2
                        ELSE 0
                    END as actual
                FROM V3_Forge_Results r
                JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
                WHERE r.simulation_id = ? AND f.status_short IN ('FT', 'AET', 'PEN')
            """
            df = pd.read_sql_query(query, conn, params=(simulation_id,))
            
            if df.empty:
                logger.warning(f"⚠️ No settled results found for simulation {simulation_id}")
                return
                
            # 2. Calculate Core Metrics (Accuracy, Brier, Log-Loss)
            summary = self._calculate_group_metrics(df)
            
            # 3. Save Summary to V3_Forge_Simulations
            conn.execute("""
                UPDATE V3_Forge_Simulations 
                SET summary_metrics_json = ?, status = 'COMPLETED'
                WHERE id = ?
            """, (json.dumps(summary), simulation_id))
            
            # 4. Settle into V3_Quant_Ledger (US_203 requirement)
            # Fetch context from simulation record
            sim_info = conn.execute("SELECT league_id, model_id FROM V3_Forge_Simulations WHERE id = ?", (simulation_id,)).fetchone()
            if sim_info and sim_info[1]:
                league_id, model_id = sim_info
                conn.execute("""
                    INSERT INTO V3_Quant_Ledger (
                        league_id, model_id, simulation_id, total_simulations, 
                        correct_winner_pct, accuracy, brier_score, log_loss, avg_confidence
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    league_id, model_id, simulation_id, 
                    summary['count'], summary['accuracy'], summary['accuracy'],
                    summary['brier_score'], summary['log_loss'], summary['avg_confidence']
                ))
            
            conn.commit()
            logger.info(f"✅ Quant Ledger updated for Sim {simulation_id}. Accuracy: {summary['accuracy']:.2%}")
            return summary

        except Exception as e:
            logger.error(f"❌ Error settling simulation {simulation_id}: {e}")
            conn.rollback()
        finally:
            conn.close()

    def _calculate_group_metrics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculates core quant metrics (Accuracy, Brier, Log-Loss)."""
        y_true = df['actual'].values.astype(int)
        # Order: [Draw, Home, Away] corresponding to labels [0, 1, 2]
        probs = df[['prob_draw', 'prob_home', 'prob_away']].values
        
        # 1. Accuracy
        preds = np.argmax(probs, axis=1)
        accuracy = np.mean(preds == y_true)
        
        # 2. Brier Score (Calibration)
        y_one_hot = np.zeros((len(y_true), 3))
        y_one_hot[np.arange(len(y_true)), y_true] = 1
        brier = np.mean(np.sum((probs - y_one_hot)**2, axis=1))
        
        # 3. Log-Loss (Information Gain)
        probs_clipped = np.clip(probs, 1e-15, 1 - 1e-15)
        logloss = -np.mean(np.sum(y_one_hot * np.log(probs_clipped), axis=1))
        
        # 4. Confidence Analysis
        # Confidence is the max prob assigned to the predicted class
        confidences = np.max(probs, axis=1)
        avg_confidence = np.mean(confidences)
        
        # 5. Overconfidence Detector
        overconfidence_warning = False
        high_conf_mask = confidences > 0.85
        if np.sum(high_conf_mask) > 5:
            high_conf_win_rate = np.mean(preds[high_conf_mask] == y_true[high_conf_mask])
            if high_conf_win_rate < 0.65:
                overconfidence_warning = True

        # 6. Calibration Buckets
        calibration = self._calculate_calibration(probs, y_one_hot)
        
        return {
            'count': len(df),
            'accuracy': float(accuracy),
            'brier_score': float(brier),
            'log_loss': float(logloss),
            'avg_confidence': float(avg_confidence),
            'overconfidence_warning': overconfidence_warning,
            'calibration': calibration,
            'timestamp': datetime.now().isoformat()
        }

    def _calculate_calibration(self, probs, y_one_hot) -> List[Dict]:
        """Check if 70% probability really means 70% outcome rate."""
        bins = np.linspace(0, 1, 6) # 0%, 20%, 40%, 60%, 80%, 100%
        bin_results = []
        
        flat_probs = probs.flatten()
        flat_actuals = y_one_hot.flatten()
        
        for i in range(len(bins)-1):
            lower, upper = bins[i], bins[i+1]
            mask = (flat_probs >= lower) & (flat_probs < upper)
            if np.any(mask):
                bin_results.append({
                    'bucket': f"{int(lower*100)}-{int(upper*100)}%",
                    'avg_prob': float(np.mean(flat_probs[mask])),
                    'actual_rate': float(np.mean(flat_actuals[mask])),
                    'count': int(np.sum(mask))
                })
        return bin_results
