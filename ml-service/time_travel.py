import sqlite3
import pandas as pd
import numpy as np
import json
import os
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from db_config import get_connection

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('TemporalFeatureFactory')

class FeatureAdapter:
    """Base class for modular feature extraction segments."""
    def __init__(self, name: str):
        self.name = name

    def get_features(self, conn, h_id: int, a_id: int, morning_of: str, fixture_id: Optional[int] = None, **kwargs) -> Dict[str, float]:
        raise NotImplementedError

class MomentumAdapter(FeatureAdapter):
    def get_features(self, conn, h_id: int, a_id: int, morning_of: str, fixture_id: Optional[int] = None, **kwargs) -> Dict[str, float]:
        home_mom = self._get_team_momentum(conn, h_id, morning_of)
        away_mom = self._get_team_momentum(conn, a_id, morning_of)
        return {
            "mom_gd_h3": home_mom['gd_3'], "mom_gd_h5": home_mom['gd_5'], "mom_gd_h10": home_mom['gd_10'], "mom_gd_h20": home_mom['gd_20'],
            "mom_pts_h3": home_mom['pts_3'], "mom_pts_h5": home_mom['pts_5'], "mom_pts_h10": home_mom['pts_10'], "mom_pts_h20": home_mom['pts_20'],
            "win_rate_h5": home_mom['win_5'], "win_rate_h10": home_mom['win_10'], "cs_rate_h5": home_mom['cs_5'], "cs_rate_h10": home_mom['cs_10'],
            "mom_gd_a3": away_mom['gd_3'], "mom_gd_a5": away_mom['gd_5'], "mom_gd_a10": away_mom['gd_10'], "mom_gd_a20": away_mom['gd_20'],
            "mom_pts_a3": away_mom['pts_3'], "mom_pts_a5": away_mom['pts_5'], "mom_pts_a10": away_mom['pts_10'], "mom_pts_a20": away_mom['pts_20'],
            "win_rate_a5": away_mom['win_5'], "win_rate_a10": away_mom['win_10'], "cs_rate_a5": away_mom['cs_5'], "cs_rate_a10": away_mom['cs_10'],
            "def_res_h": home_mom['ga_10'], "def_res_a": away_mom['ga_10']
        }

    def _get_team_momentum(self, conn, team_id: int, match_date: str) -> Dict[str, float]:
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
        results = {f'{k}_{w}': 0.0 for k in ['gd', 'pts', 'win', 'cs'] for w in [3, 5, 10, 20]}
        results['ga_10'] = 0.0
        if df.empty: return results
        def process_row(row):
            is_home = row['home_team_id'] == team_id
            gf, ga = (row['goals_home'], row['goals_away']) if is_home else (row['goals_away'], row['goals_home'])
            gd = gf - ga
            pts = 3 if gd > 0 else (1 if gd == 0 else 0)
            return pd.Series({'gd': gd, 'pts': pts, 'ga': ga, 'win': 1 if pts == 3 else 0, 'cs': 1 if ga == 0 else 0})
        stats = df.apply(process_row, axis=1)
        for w in [3, 5, 10, 20]:
            slice_df = stats.head(w)
            if len(slice_df) > 0:
                for k in ['gd', 'pts', 'win', 'cs']: results[f'{k}_{w}'] = float(slice_df[k].mean())
        results['ga_10'] = float(stats.head(10)['ga'].mean()) if not stats.empty else 0.0
        return results

class ContextAdapter(FeatureAdapter):
    def get_features(self, conn, h_id: int, a_id: int, morning_of: str, fixture_id: Optional[int] = None, **kwargs) -> Dict[str, float]:
        h2h = self._get_h2h_context(conn, h_id, a_id, morning_of)
        home_venue = self._get_venue_stats(conn, h_id, morning_of)
        away_venue = self._get_venue_stats(conn, a_id, morning_of)
        round_name = kwargs.get('round_name', '')
        return {
            "rest_h": self._get_rest_days(conn, h_id, morning_of),
            "rest_a": self._get_rest_days(conn, a_id, morning_of),
            "h2h_h_wins": h2h['h_wins'], "h2h_draws": h2h['draws'], "h2h_a_wins": h2h['a_wins'],
            "venue_diff_h": home_venue['pts_home'] - home_venue['pts_away'],
            "venue_diff_a": away_venue['pts_home'] - away_venue['pts_away'],
            "lqi_h": self._get_lqi(conn, fixture_id, h_id),
            "lqi_a": self._get_lqi(conn, fixture_id, a_id),
            "elo_h": self._get_team_elo(conn, h_id, morning_of),
            "elo_a": self._get_team_elo(conn, a_id, morning_of),
            "is_derby": self._is_derby(conn, h_id, a_id),
            "travel_km": self._calculate_travel(conn, h_id, a_id),
            "high_stakes": 1 if any(x in round_name.lower() for x in ['final', 'relegation', 'play-off']) else 0
        }

    def _get_rest_days(self, conn, team_id, match_date):
        query = "SELECT date FROM V3_Fixtures WHERE (home_team_id = %s OR away_team_id = %s) AND date < %s AND status_short IN ('FT', 'AET', 'PEN') ORDER BY date DESC LIMIT 1"
        cur = conn.cursor(); cur.execute(query, (team_id, team_id, match_date))
        row = cur.fetchone()
        if not row: return 14.0
        diff = (pd.to_datetime(match_date) - pd.to_datetime(row[0])).days
        return float(min(max(diff, 0), 14))

    def _get_venue_stats(self, conn, team_id: int, match_date: str) -> Dict[str, float]:
        query = "SELECT goals_home, goals_away, home_team_id FROM V3_Fixtures WHERE (home_team_id = %s OR away_team_id = %s) AND date < %s AND status_short IN ('FT', 'AET', 'PEN') ORDER BY date DESC LIMIT 20"
        df = pd.read_sql_query(query, conn, params=(team_id, team_id, match_date))
        if df.empty: return {'pts_home': 1.0, 'pts_away': 1.0}
        df['is_home'] = df['home_team_id'] == team_id
        df['pts'] = df.apply(lambda r: (3 if r.goals_home > r.goals_away else (1 if r.goals_home == r.goals_away else 0)) if r.is_home else (3 if r.goals_away > r.goals_home else (1 if r.goals_home == r.goals_away else 0)), axis=1)
        # Using handle for potential NaN
        h_pts_slice = df[df['is_home']]['pts']
        a_pts_slice = df[~df['is_home']]['pts']
        h_pts = h_pts_slice.mean() if not h_pts_slice.empty else 1.0
        a_pts = a_pts_slice.mean() if not a_pts_slice.empty else 1.0
        return {'pts_home': h_pts if not pd.isna(h_pts) else 1.0, 'pts_away': a_pts if not pd.isna(a_pts) else 1.0}

    def _get_h2h_context(self, conn, h_id, a_id, match_date):
        query = "SELECT goals_home, goals_away, home_team_id FROM V3_Fixtures WHERE ((home_team_id = %s AND away_team_id = %s) OR (home_team_id = %s AND away_team_id = %s)) AND date < %s AND status_short IN ('FT', 'AET', 'PEN') ORDER BY date DESC LIMIT 3"
        df = pd.read_sql_query(query, conn, params=(h_id, a_id, a_id, h_id, match_date))
        counts = {'h_wins': 0, 'draws': 0, 'a_wins': 0}
        for _, row in df.iterrows():
            if row['goals_home'] == row['goals_away']: counts['draws'] += 1
            elif (row['home_team_id'] == h_id and row['goals_home'] > row['goals_away']) or (row['home_team_id'] != h_id and row['goals_home'] < row['goals_away']): counts['h_wins'] += 1
            else: counts['a_wins'] += 1
        total = len(df)
        return {k: v/total for k, v in counts.items()} if total > 0 else {'h_wins': 0.33, 'draws': 0.33, 'a_wins': 0.33}

    def _get_lqi(self, conn, fixture_id, team_id):
        cur = conn.cursor()
        cur.execute("SELECT feature_data FROM V3_Feature_Snapshots WHERE fixture_id = %s AND team_id = %s AND feature_type = 'SQUAD'", (fixture_id, team_id))
        row = cur.fetchone()
        if row:
            try:
                data = json.loads(row[0])
                return data.get('lqi', data.get('rating_avg', 6.5))
            except: pass
        cur.execute("SELECT starting_xi FROM V3_Fixture_Lineups WHERE fixture_id = %s AND team_id = %s", (fixture_id, team_id))
        row = cur.fetchone()
        if row and row[0]:
            try:
                xi = json.loads(row[0]); player_ids = [p.get('player', {}).get('id') for p in xi if p.get('player', {}).get('id')]
                if player_ids:
                    cur.execute(f"SELECT scout_rank FROM V3_Players WHERE api_id IN ({','.join(['%s']*len(player_ids))})", player_ids)
                    ratings = [r[0] for r in cur.fetchall() if r[0] is not None]
                    if ratings: return sum(ratings + [6.5]*(11-len(ratings))) / 11
            except: pass
        return 6.5

    def _get_team_elo(self, conn, team_id, morning_of):
        cur = conn.cursor(); cur.execute("SELECT elo_score FROM V3_Team_Ratings WHERE team_id = %s AND date < %s ORDER BY date DESC LIMIT 1", (team_id, morning_of))
        row = cur.fetchone()
        if row: return float(row[0])
        cur.execute("SELECT scout_rank FROM V3_Teams WHERE team_id = %s", (team_id,))
        row = cur.fetchone(); return float(row[0] if row and row[0] is not None else 1500.0)

    def _is_derby(self, conn, h_id, a_id):
        if {h_id, a_id} in [{541, 529}, {40, 33}, {85, 81}, {80, 1063}, {505, 489}, {505, 496}, {42, 47}]: return 1
        cur = conn.cursor(); cur.execute("SELECT v.city FROM V3_Teams t LEFT JOIN V3_Venues v ON t.venue_id = v.api_id WHERE t.team_id IN (%s, %s)", (h_id, a_id))
        cities = [r[0] for r in cur.fetchall() if r[0]]
        return 1 if len(cities) == 2 and cities[0] == cities[1] else 0

    def _calculate_travel(self, conn, h_id, a_id): return 0.0

class XGAdapter(FeatureAdapter):
    def get_features(self, conn, h_id: int, a_id: int, morning_of: str, fixture_id: Optional[int] = None, **kwargs) -> Dict[str, float]:
        home_xg = self._get_team_xg_momentum(conn, h_id, morning_of)
        away_xg = self._get_team_xg_momentum(conn, a_id, morning_of)
        return {
            "mom_xg_f_h3": home_xg['xg_f_3'], "mom_xg_f_h5": home_xg['xg_f_5'], "mom_xg_f_h10": home_xg['xg_f_10'],
            "mom_xg_a_h3": home_xg['xg_a_3'], "mom_xg_a_h5": home_xg['xg_a_5'], "mom_xg_a_h10": home_xg['xg_a_10'],
            "xg_eff_h5": home_xg['eff_5'],
            "mom_xg_f_a3": away_xg['xg_f_3'], "mom_xg_f_a5": away_xg['xg_f_5'], "mom_xg_f_a10": away_xg['xg_f_10'],
            "mom_xg_a_a3": away_xg['xg_a_3'], "mom_xg_a_a5": away_xg['xg_a_5'], "mom_xg_a_a10": away_xg['xg_a_10'],
            "xg_eff_a5": away_xg['eff_5']
        }

    def _get_team_xg_momentum(self, conn, team_id: int, match_date: str) -> Dict[str, float]:
        query = """
            SELECT xg_home, xg_away, goals_home, goals_away, home_team_id
            FROM V3_Fixtures
            WHERE (home_team_id = %s OR away_team_id = %s)
              AND date < %s
              AND status_short IN ('FT', 'AET', 'PEN')
              AND xg_home IS NOT NULL
            ORDER BY date DESC
            LIMIT 10
        """
        df = pd.read_sql_query(query, conn, params=(team_id, team_id, match_date))
        results = {f'xg_{k}_{w}': 0.0 for k in ['f', 'a'] for w in [3, 5, 10]}
        results['eff_5'] = 1.0
        if df.empty: return results

        def process_row(row):
            is_home = row['home_team_id'] == team_id
            xg_f = row['xg_home'] if is_home else row['xg_away']
            xg_a = row['xg_away'] if is_home else row['xg_home']
            gf = row['goals_home'] if is_home else row['goals_away']
            return pd.Series({'xg_f': xg_f, 'xg_a': xg_a, 'gf': gf})

        stats = df.apply(process_row, axis=1)
        for w in [3, 5, 10]:
            slice_df = stats.head(w)
            if not slice_df.empty:
                results[f'xg_f_{w}'] = float(slice_df['xg_f'].mean())
                results[f'xg_a_{w}'] = float(slice_df['xg_a'].mean())
        
        eff_slice = stats.head(5)
        if not eff_slice.empty:
            total_xg = eff_slice['xg_f'].sum()
            results['eff_5'] = float(eff_slice['gf'].sum() / total_xg) if total_xg > 0 else 1.0
            results['eff_5'] = float(np.clip(results['eff_5'], 0.5, 2.0))
        
        return results

class TemporalFeatureFactory:
    """Refactored Temporal Feature Factory with Adapter architecture."""
    def __init__(self, db_path: Optional[str] = None):
        self.adapters = [MomentumAdapter("momentum"), ContextAdapter("context"), XGAdapter("xg")]
        self.feature_columns = [
            "mom_gd_h3", "mom_gd_h5", "mom_gd_h10", "mom_gd_h20",
            "mom_pts_h3", "mom_pts_h5", "mom_pts_h10", "mom_pts_h20",
            "win_rate_h5", "win_rate_h10", "cs_rate_h5", "cs_rate_h10",
            "mom_gd_a3", "mom_gd_a5", "mom_gd_a10", "mom_gd_a20",
            "mom_pts_a3", "mom_pts_a5", "mom_pts_a10", "mom_pts_a20",
            "win_rate_a5", "win_rate_a10", "cs_rate_a5", "cs_rate_a10",
            "mom_xg_f_h3", "mom_xg_f_h5", "mom_xg_f_h10",
            "mom_xg_a_h3", "mom_xg_a_h5", "mom_xg_a_h10",
            "xg_eff_h5",
            "mom_xg_f_a3", "mom_xg_f_a5", "mom_xg_f_a10",
            "mom_xg_a_a3", "mom_xg_a_a5", "mom_xg_a_a10",
            "xg_eff_a5",
            "rest_h", "rest_a",
            "h2h_h_wins", "h2h_draws", "h2h_a_wins",
            "lqi_h", "lqi_a",
            "elo_h", "elo_a",
            "venue_diff_h", "venue_diff_a",
            "def_res_h", "def_res_a",
            "is_derby", "travel_km", "high_stakes"
        ]

    def get_vector(self, fixture_id: int, conn=None) -> Dict[str, float]:
        should_close = False
        if conn is None: conn = get_connection(); should_close = True
        try:
            cur = conn.cursor()
            cur.execute("SELECT date, home_team_id, away_team_id, round FROM V3_Fixtures WHERE fixture_id = %s", (fixture_id,))
            fix = cur.fetchone()
            if not fix: raise ValueError(f"Fixture {fixture_id} not found.")
            morning_of = fix[0].split('T')[0]
            vector = {}
            for adapter in self.adapters:
                # Use explicit keyword arguments to avoid mismatch
                vector.update(adapter.get_features(conn, fix[1], fix[2], morning_of, fixture_id=fixture_id, round_name=fix[3] or ""))
            
            # Ensure all feature_columns are present and clean
            result = {}
            for col in self.feature_columns:
                val = vector.get(col, 0.0)
                if pd.isna(val) or np.isinf(val):
                    result[col] = 0.0
                else:
                    result[col] = float(val)
            return result
        except Exception as e:
            logger.error(f"Error for {fixture_id}: {e}")
            return {col: 0.0 for col in self.feature_columns}
        finally:
            if should_close: conn.close()

if __name__ == "__main__":
    factory = TemporalFeatureFactory()
    conn = get_connection()
    test_fid = conn.cursor(); test_fid.execute("SELECT fixture_id FROM V3_Fixtures WHERE status_short='FT' ORDER BY date DESC LIMIT 1"); row = test_fid.fetchone()
    if row:
        print(f"--- Testing Refactored Vector for Fixture {row[0]} ---")
        print(json.dumps(factory.get_vector(row[0]), indent=4))
    conn.close()
