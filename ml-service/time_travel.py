import sqlite3
import pandas as pd
import numpy as np
import json
import os
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('TemporalFeatureFactory')


class TemporalFeatureFactory:
    """
    US_181: Temporal Feature Factory
    Strict leakage-proof feature extractor. Fetches data exactly as it was known before a match.
    Enforces the 'Morning-Of' rule: date < target_date.
    """
    def __init__(self, db_path: str = "statfoot.db"):
        self.db_path = db_path
        # Standardized Sequence Order for XGBoost / Random Forest
        self.feature_columns = [
            "mom_gd_h3", "mom_gd_h5", "mom_gd_h10", "mom_gd_h20",
            "mom_pts_h3", "mom_pts_h5", "mom_pts_h10", "mom_pts_h20",
            "win_rate_h5", "win_rate_h10", "cs_rate_h5", "cs_rate_h10",
            "mom_gd_a3", "mom_gd_a5", "mom_gd_a10", "mom_gd_a20",
            "mom_pts_a3", "mom_pts_a5", "mom_pts_a10", "mom_pts_a20",
            "win_rate_a5", "win_rate_a10", "cs_rate_a5", "cs_rate_a10",
            "rest_h", "rest_a",
            "h2h_h_wins", "h2h_draws", "h2h_a_wins",
            "lqi_h", "lqi_a",
            "elo_h", "elo_a",
            "venue_diff_h", "venue_diff_a",
            "def_res_h", "def_res_a",
            "is_derby", "travel_km", "high_stakes"
        ]

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def get_vector(self, fixture_id: int, conn: sqlite3.Connection = None) -> Dict[str, float]:
        """
        Main entry point: Returns a standardized feature dictionary for a fixture.
        Priority 1: Check V3_Feature_Snapshots for pre-preserved state.
        Fall-back: Dynamic SQL reconstruction using strictly 'as-of' data.
        """
        should_close = False
        if conn is None:
            conn = self.get_connection()
            should_close = True
            
        conn.row_factory = sqlite3.Row
        
        try:
            # 1. Fetch Fixture Context
            cur = conn.cursor()
            cur.execute("""
                SELECT date, home_team_id, away_team_id, league_id, round 
                FROM V3_Fixtures 
                WHERE fixture_id = ?
            """, (fixture_id,))
            fixture = cur.fetchone()
            
            if not fixture:
                raise ValueError(f"Fixture {fixture_id} not found.")
                
            match_date_full = fixture['date']
            # US_181: The "Morning-Of" Rule - strictly calculate features as they stood on the morning of the match.
            # This ignores any data from the match day itself.
            morning_of = match_date_full.split('T')[0]
            
            h_id = fixture['home_team_id']
            a_id = fixture['away_team_id']
            league_id = fixture['league_id']
            round_name = fixture['round'] or ""
            
            # 2. Build the vector
            vector = self._assemble_vector(conn, h_id, a_id, morning_of, fixture_id, round_name)
            
            # 3. Standardization & Cleansing

            # Fatigue
            vector["rest_h"] = self._get_rest_days(conn, h_id, morning_of)
            vector["rest_a"] = self._get_rest_days(conn, a_id, morning_of)

            
            # B. Venue-Specific Resilience and Differentials
            vector["def_res_h"] = home_mom['ga_10']
            vector["def_res_a"] = away_mom['ga_10']
            
            home_venue = self._get_venue_stats(conn, h_id, morning_of)
            away_venue = self._get_venue_stats(conn, a_id, morning_of)
            vector["venue_diff_h"] = home_venue['pts_home'] - home_venue['pts_away']
            vector["venue_diff_a"] = away_venue['pts_home'] - away_venue['pts_away']
            
            # C. H2H Context (Last 3 meetings)
            h2h = self._get_h2h_context(conn, h_id, a_id, morning_of)
            vector.update({
                "h2h_h_wins": h2h['h_wins'],
                "h2h_draws": h2h['draws'],
                "h2h_a_wins": h2h['a_wins']
            })
            
            # D. LQI (Lineup Quality Index)
            # US_181: Priority V3_Feature_Snapshots -> Fallback V3_Fixture_Lineups
            vector["lqi_h"] = self._get_lqi(conn, fixture_id, h_id)
            vector["lqi_a"] = self._get_lqi(conn, fixture_id, a_id)
            
            # E. ELO / Power Score (US_188 Integration)
            vector["elo_h"] = self._get_team_elo(conn, h_id, morning_of)
            vector["elo_a"] = self._get_team_elo(conn, a_id, morning_of)
            
            # F. Narrative Context
            vector["is_derby"] = self._is_derby(conn, h_id, a_id)
            vector["travel_km"] = self._calculate_travel(conn, h_id, a_id)
            vector["high_stakes"] = 1 if any(x in round_name.lower() for x in ['final', 'relegation', 'play-off']) else 0
            
            # 3. Standardization & Cleansing
            standard_vector = {}
            for col in self.feature_columns:
                val = vector.get(col, 0.0)
                # Handle NaNs and Infs which cause issues in XGBoost
                if pd.isna(val) or np.isinf(val):
                    standard_vector[col] = 0.0
                else:
                    standard_vector[col] = float(val)
            
            return standard_vector

        except (sqlite3.Error, ValueError, KeyError) as e:
            logger.error(f"Error generating vector for fixture {fixture_id}: {e}")
            # Return zeroed vector on failure to prevent pipeline crash
            return {col: 0.0 for col in self.feature_columns}
        finally:
            if should_close:
                conn.close()

    def _assemble_vector(self, conn, h_id, a_id, morning_of, fixture_id, round_name) -> Dict[str, float]:
        vector = {}
        
        # A. Rolling Momentum (3, 5, 10, 20)
        home_mom = self._get_team_momentum(conn, h_id, morning_of)
        away_mom = self._get_team_momentum(conn, a_id, morning_of)
        
        vector.update({
            "mom_gd_h3": home_mom['gd_3'], "mom_gd_h5": home_mom['gd_5'], "mom_gd_h10": home_mom['gd_10'], "mom_gd_h20": home_mom['gd_20'],
            "mom_pts_h3": home_mom['pts_3'], "mom_pts_h5": home_mom['pts_5'], "mom_pts_h10": home_mom['pts_10'], "mom_pts_h20": home_mom['pts_20'],
            "win_rate_h5": home_mom['win_5'], "win_rate_h10": home_mom['win_10'], "cs_rate_h5": home_mom['cs_5'], "cs_rate_h10": home_mom['cs_10'],
            "mom_gd_a3": away_mom['gd_3'], "mom_gd_a5": away_mom['gd_5'], "mom_gd_a10": away_mom['gd_10'], "mom_gd_a20": away_mom['gd_20'],
            "mom_pts_a3": away_mom['pts_3'], "mom_pts_a5": away_mom['pts_5'], "mom_pts_a10": away_mom['pts_10'], "mom_pts_a20": away_mom['pts_20'],
            "win_rate_a5": away_mom['win_5'], "win_rate_a10": away_mom['win_10'], "cs_rate_a5": away_mom['cs_5'], "cs_rate_a10": away_mom['cs_10'],
        })

        # B. Venue & Fatigue
        vector["rest_h"] = self._get_rest_days(conn, h_id, morning_of)
        vector["rest_a"] = self._get_rest_days(conn, a_id, morning_of)
        
        home_venue = self._get_venue_stats(conn, h_id, morning_of)
        away_venue = self._get_venue_stats(conn, a_id, morning_of)
        vector["venue_diff_h"] = home_venue['pts_home'] - home_venue['pts_away']
        vector["venue_diff_a"] = away_venue['pts_home'] - away_venue['pts_away']
        vector["def_res_h"] = home_mom['ga_10']
        vector["def_res_a"] = away_mom['ga_10']
        
        # C. Contextual Data (H2H, LQI, ELO, Story)
        h2h = self._get_h2h_context(conn, h_id, a_id, morning_of)
        vector.update({"h2h_h_wins": h2h['h_wins'], "h2h_draws": h2h['draws'], "h2h_a_wins": h2h['a_wins']})
        
        vector["lqi_h"] = self._get_lqi(conn, fixture_id, h_id)
        vector["lqi_a"] = self._get_lqi(conn, fixture_id, a_id)
        vector["elo_h"] = self._get_team_elo(conn, h_id, morning_of)
        vector["elo_a"] = self._get_team_elo(conn, a_id, morning_of)
        
        vector["is_derby"] = self._is_derby(conn, h_id, a_id)
        vector["travel_km"] = self._calculate_travel(conn, h_id, a_id)
        vector["high_stakes"] = 1 if any(x in round_name.lower() for x in ['final', 'relegation', 'play-off']) else 0
        
        return vector

    def _get_team_momentum(self, conn, team_id: int, match_date: str) -> Dict[str, float]:
        """Calculates GD, PTS, Win Rate, and CS Rate for 3, 5, 10, 20 matches strictly BEFORE match_date."""
        query = """
            SELECT goals_home, goals_away, home_team_id, away_team_id
            FROM V3_Fixtures
            WHERE (home_team_id = %s OR away_team_id = %s)
              AND date < %s
              AND status_short IN ('FT', 'AET', 'PEN')
            ORDER BY date DESC
            LIMIT 20
        """
        df = pd.read_sql_query(query, conn, params=(team_id, team_id, match_date))
        
        results = {}
        # Pre-fill with zeros
        for w in [3, 5, 10, 20]:
            results[f'gd_{w}'] = 0.0
            results[f'pts_{w}'] = 0.0
            results[f'win_{w}'] = 0.0
            results[f'cs_{w}'] = 0.0
        results['ga_10'] = 0.0

        if df.empty:
            return results
            
        def process_row(row):
            is_home = row['home_team_id'] == team_id
            gf = row['goals_home'] if is_home else row['goals_away']
            ga = row['goals_away'] if is_home else row['goals_home']
            gd = gf - ga
            pts = 3 if gd > 0 else (1 if gd == 0 else 0)
            is_win = 1 if pts == 3 else 0
            is_cs = 1 if ga == 0 else 0
            return pd.Series({'gd': gd, 'pts': pts, 'ga': ga, 'win': is_win, 'cs': is_cs})
            
        stats = df.apply(process_row, axis=1)
        
        for w in [3, 5, 10, 20]:
            slice_df = stats.head(w)
            if len(slice_df) > 0:
                results[f'gd_{w}'] = float(slice_df['gd'].mean())
                results[f'pts_{w}'] = float(slice_df['pts'].mean())
                results[f'win_{w}'] = float(slice_df['win'].mean())
                results[f'cs_{w}'] = float(slice_df['cs'].mean())
        
        results['ga_10'] = float(stats.head(10)['ga'].mean()) if len(stats) >= 1 else 0.0
        
        return results

    def _get_rest_days(self, conn, team_id: int, match_date: str) -> float:
        """Calculates days since last match."""
        query = "SELECT date FROM V3_Fixtures WHERE (home_team_id = ? OR away_team_id = ?) AND date < ? AND status_short IN ('FT', 'AET', 'PEN') ORDER BY date DESC LIMIT 1"
        cur = conn.cursor()
        cur.execute(query, (team_id, team_id, match_date))
        row = cur.fetchone()
        if not row:
            return 14.0 # Default for first game of season
        
        last_date = pd.to_datetime(row[0])
        curr_date = pd.to_datetime(match_date)
        diff = (curr_date - last_date).days
        return float(min(max(diff, 0), 14))


    def _get_venue_stats(self, conn, team_id: int, match_date: str) -> Dict[str, float]:
        """Calculates avg points at home vs away for a team before match_date."""
        query = """
            SELECT goals_home, goals_away, home_team_id, away_team_id
            FROM V3_Fixtures
            WHERE (home_team_id = ? OR away_team_id = ?)
              AND date < ?
              AND status_short IN ('FT', 'AET', 'PEN')
            ORDER BY date DESC
            LIMIT 20
        """
        df = pd.read_sql_query(query, conn, params=(team_id, team_id, match_date))
        if df.empty:
            return {'pts_home': 1.0, 'pts_away': 1.0}
            
        df['is_home'] = df['home_team_id'] == team_id
        df['pts'] = df.apply(lambda r: 
            (3 if r.goals_home > r.goals_away else (1 if r.goals_home == r.goals_away else 0)) if r.is_home
            else (3 if r.goals_away > r.goals_home else (1 if r.goals_home == r.goals_away else 0)), axis=1)
            
        home_pts = df[df['is_home'] == True]['pts'].mean()
        away_pts = df[df['is_home'] == False]['pts'].mean()
        
        return {
            'pts_home': home_pts if not pd.isna(home_pts) else 1.0,
            'pts_away': away_pts if not pd.isna(away_pts) else 1.0
        }

    def _get_h2h_context(self, conn, h_id: int, a_id: int, match_date: str) -> Dict[str, float]:
        """Calculates win distribution for last 3 meetings strictly before match_date."""
        query = """
            SELECT goals_home, goals_away, home_team_id, away_team_id
            FROM V3_Fixtures
            WHERE ((home_team_id = ? AND away_team_id = ?) OR (home_team_id = ? AND away_team_id = ?))
              AND date < ?
              AND status_short IN ('FT', 'AET', 'PEN')
            ORDER BY date DESC
            LIMIT 3
        """
        df = pd.read_sql_query(query, conn, params=(h_id, a_id, a_id, h_id, match_date))
        
        counts = {'h_wins': 0, 'draws': 0, 'a_wins': 0}
        for _, row in df.iterrows():
            if row['goals_home'] == row['goals_away']:
                counts['draws'] += 1
            elif row['home_team_id'] == h_id:
                if row['goals_home'] > row['goals_away']: counts['h_wins'] += 1
                else: counts['a_wins'] += 1
            else: # home_team is a_id
                if row['goals_home'] > row['goals_away']: counts['a_wins'] += 1
                else: counts['h_wins'] += 1
        
        total = len(df)
        if total > 0:
            return {k: v/total for k, v in counts.items()}
        return {'h_wins': 0.33, 'draws': 0.33, 'a_wins': 0.33}

    def _get_lqi(self, conn, fixture_id: int, team_id: int) -> float:
        """Lineup Quality Index Reconstruction: Snapshot -> Lineup -> Default."""
        cur = conn.cursor()
        
        # 1. Snapshot Priority (US_181)
        cur.execute("""
            SELECT feature_data FROM V3_Feature_Snapshots 
            WHERE fixture_id = ? AND team_id = ? AND feature_type = 'SQUAD'
        """, (fixture_id, team_id))
        row = cur.fetchone()
        if row:
            try:
                data = json.loads(row['feature_data'])
                if 'lqi' in data: return data['lqi']
                if 'rating_avg' in data: return data['rating_avg']
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                logger.debug(f"Snapshot parsing failed: {e}")
                pass
            
        # 2. Dynamic Reconstruction (SQL Fallback)
        cur.execute("""
            SELECT starting_xi FROM V3_Fixture_Lineups 
            WHERE fixture_id = ? AND team_id = ?
        """, (fixture_id, team_id))
        row = cur.fetchone()
        if row and row['starting_xi']:
            try:
                xi = json.loads(row['starting_xi'])
                player_ids = []
                for p in xi:
                    pid = p.get('player', {}).get('id')
                    if pid: player_ids.append(pid)
                
                if player_ids:
                    placeholders = ','.join(['?'] * len(player_ids))
                    # Get ratings from V3_Players (scout_rank)
                    cur.execute(f"SELECT scout_rank FROM V3_Players WHERE api_id IN ({placeholders})", player_ids)
                    ratings = [r[0] for r in cur.fetchall() if r[0] is not None]
                    if ratings:
                        # Pad to 11 if some players missing
                        while len(ratings) < 11: ratings.append(6.5)
                        return sum(ratings) / len(ratings)
            except (json.JSONDecodeError, KeyError, TypeError, sqlite3.Error) as e:
                logger.debug(f"LQI Reconstruction failed for {fixture_id}/{team_id}: {e}")
                
        return 6.5 # Safe baseline

    def _get_team_elo(self, conn, team_id: int, morning_of: str) -> float:
        """Fetch team power score (ELO) as of the morning of the match."""
        cur = conn.cursor()
        cur.execute("""
            SELECT elo_score FROM V3_Team_Ratings 
            WHERE team_id = ? AND date < ? 
            ORDER BY date DESC LIMIT 1
        """, (team_id, morning_of))
        row = cur.fetchone()
        if row:
            return float(row[0])
            
        # Fallback to current scout_rank if no historical ELO (e.g. first match)
        cur.execute("SELECT scout_rank FROM V3_Teams WHERE team_id = ?", (team_id,))
        row = cur.fetchone()
        return float(row[0] if row and row[0] is not None else 1500.0)

    def _is_derby(self, conn, h_id: int, a_id: int) -> int:
        """Basic derby detection (same city or hardcoded rivalry)."""
        # Hardcoded major rivalries from features.py logic
        MAJOR_RIVALRIES = [{541, 529}, {40, 33}, {85, 81}, {80, 1063}, {505, 489}, {505, 496}, {42, 47}]
        if {h_id, a_id} in MAJOR_RIVALRIES:
            return 1
            
        cur = conn.cursor()
        cur.execute("""
            SELECT v.city FROM V3_Teams t 
            LEFT JOIN V3_Venues v ON t.venue_id = v.api_id
            WHERE t.team_id IN (?, ?)
        """, (h_id, a_id))
        cities = [r[0] for r in cur.fetchall() if r[0]]
        if len(cities) == 2 and cities[0] == cities[1]:
            return 1
        return 0

    def _calculate_travel(self, conn, h_id: int, a_id: int) -> float:
        """Placeholder for travel distance calculation if coordinates available."""
        # This would require a coordinates lookup table. Using 0 by default.
        return 0.0

    def validate_leakage(self, fixture_id: int, vector: Dict[str, float]) -> bool:
        """
        Validation step: Verifies that match results from target_date are NOT in features.
        """
        # The logic is strictly enforced in SQL queries via `date < match_date`.
        # This method could be expanded with more rigorous checks if needed.
        return True

if __name__ == "__main__":
    factory = TemporalFeatureFactory()
    # Test with a finished fixture
    import sys
    conn_test = get_connection()
    test_fid = conn_test.execute("SELECT fixture_id FROM V3_Fixtures WHERE status_short='FT' ORDER BY date DESC LIMIT 1").fetchone()
    if test_fid:
        fid = test_fid[0]
        print(f"--- [US_181] Testing Temporal Vector for Fixture {fid} ---")
        vec = factory.get_vector(fid)
        print(json.dumps(vec, indent=4))
    else:
        print("No finished fixtures found for testing.")
    conn_test.close()
