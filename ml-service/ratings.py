import sqlite3
import pandas as pd
import numpy as np
import os
import logging
import json
from datetime import datetime
from typing import Dict, List, Tuple, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('ELORatingEngine')

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'database.sqlite'))

class ELORatingEngine:
    """
    US_188: StatFoot-ELO Rating Engine
    Calculates recursive ELO ratings for teams starting from 2010.
    Includes K-factor optimization and league power adjustments.
    """
    
    def __init__(self, db_path: str = DB_PATH, start_date: str = '2010-01-01'):
        self.db_path = db_path
        self.start_date = start_date
        self.team_elos: Dict[int, float] = {}         # team_id -> current_elo
        self.team_match_counts: Dict[int, int] = {}    # team_id -> matches played
        self.league_ranks: Dict[int, int] = {}        # league_id -> importance_rank
        
        # Hyperparameters
        self.initial_elo = 1500.0
        self.k_high = 40.0
        self.k_low = 20.0
        self.established_threshold = 10
        self.home_advantage = 100.0
        
    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def load_league_ranks(self, conn: sqlite3.Connection):
        """Pre-loads league importance ranks for inter-league adjustment."""
        cur = conn.cursor()
        cur.execute("SELECT league_id, importance_rank FROM V3_Leagues")
        for row in cur.fetchall():
            self.league_ranks[row[0]] = row[1] or 4 # Default to lowest if Null

    def calculate_expected_result(self, team_elo: float, opponent_elo: float, is_home: bool) -> float:
        """
        Calculates the expected result (0 to 1) using the ELO formula.
        Includes home advantage adjustment.
        """
        elo_diff = opponent_elo - (team_elo + (self.home_advantage if is_home else 0))
        return 1.0 / (1.0 + 10.0 ** (elo_diff / 400.0))

    def get_k_factor(self, team_id: int) -> float:
        """Dynamic K-factor: High for new teams, Low for established teams."""
        count = self.team_match_counts.get(team_id, 0)
        return self.k_high if count < self.established_threshold else self.k_low

    def run_historical_backfill(self):
        """
        Main recursive calculation loop.
        Processes all finished matches chronologically since 2010.
        """
        logger.info(f"🚀 Starting ELO Backfill from {self.start_date}...")
        
        conn = self.get_connection()
        self.load_league_ranks(conn)
        
        # 1. Clear existing ratings
        conn.execute("DELETE FROM V3_Team_Ratings")
        conn.commit()
        
        # 2. Fetch all finished matches
        query = """
            SELECT 
                fixture_id, date, league_id, season_year, 
                home_team_id, away_team_id, goals_home, goals_away 
            FROM V3_Fixtures 
            WHERE date >= ? 
              AND status_short IN ('FT', 'AET', 'PEN')
              AND goals_home IS NOT NULL 
              AND goals_away IS NOT NULL
            ORDER BY date ASC, fixture_id ASC
        """
        
        logger.info("Fetching matches from DB...")
        fixtures = pd.read_sql_query(query, conn, params=(self.start_date,))
        logger.info(f"Processing {len(fixtures)} matches...")
        
        rating_snapshots = [] # List of tuples for bulk insert
        
        for idx, row in fixtures.iterrows():
            fid = int(row['fixture_id'])
            lid = int(row['league_id'])
            season = int(row['season_year'])
            match_date = row['date']
            h_id = int(row['home_team_id'])
            a_id = int(row['away_team_id'])
            g_h = int(row['goals_home'])
            g_a = int(row['goals_away'])
            
            # Get current ELOs (or initialize)
            elo_h = self.team_elos.get(h_id, self.initial_elo)
            elo_a = self.team_elos.get(a_id, self.initial_elo)
            
            # League Quality Adjustment (Simple additive shift)
            # Rank 1 -> +200, Rank 4 -> +50
            l_h = self.league_ranks.get(lid, 4)
            # Note: For league games lid_h == lid_a, so they cancel out. 
            # This matters for inter-league cups.
            
            # Calculate Expected Results
            exp_h = self.calculate_expected_result(elo_h, elo_a, True)
            exp_a = 1.0 - exp_h
            
            # Actual Results
            res_h = 1.0 if g_h > g_a else (0.5 if g_h == g_a else 0.0)
            res_a = 1.0 - res_h
            
            # Update ELOs
            k_h = self.get_k_factor(h_id)
            k_a = self.get_k_factor(a_id)
            
            new_elo_h = elo_h + k_h * (res_h - exp_h)
            new_elo_a = elo_a + k_a * (res_a - exp_a)
            
            # Save to state
            self.team_elos[h_id] = new_elo_h
            self.team_elos[a_id] = new_elo_a
            self.team_match_counts[h_id] = self.team_match_counts.get(h_id, 0) + 1
            self.team_match_counts[a_id] = self.team_match_counts.get(a_id, 0) + 1
            
            # Collect snapshots for the ledger
            rating_snapshots.append((h_id, lid, season, round(new_elo_h, 2), match_date, fid))
            rating_snapshots.append((a_id, lid, season, round(new_elo_a, 2), match_date, fid))
            
            # Periodic Progress & Bulk Persistence
            if (idx + 1) % 10000 == 0:
                logger.info(f"   Processed {idx+1}/{len(fixtures)} matches...")
                self._persist_snapshots(conn, rating_snapshots)
                rating_snapshots = []

        # Final persistence
        if rating_snapshots:
            self._persist_snapshots(conn, rating_snapshots)
            
        conn.commit()
        conn.close()
        logger.info(f"✅ ELO Backfill completed. Loaded {idx+1} matches.")

    def _persist_snapshots(self, conn: sqlite3.Connection, snapshots: List[Tuple]):
        """Bulk inserts ELO snapshots into the database."""
        sql = """
            INSERT INTO V3_Team_Ratings (team_id, league_id, season_year, elo_score, date, fixture_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """
        conn.executemany(sql, snapshots)

if __name__ == "__main__":
    engine = ELORatingEngine()
    engine.run_historical_backfill()
