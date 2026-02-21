"""
writer.py — Write-access layer for the ML Feature Store (US_031)
==============================================================

This module provides controlled write access to specific ML-related tables.
By default, the ML service is read-only. This is the ONLY place where 
database modifications are performed.

Usage:
    from db.writer import save_feature_batch
    save_feature_batch(features_list)
"""

import sqlite3
import json
import logging
from typing import List, Dict, Any
from .reader import get_db_path

logger = logging.getLogger(__name__)

def save_feature_batch(features: List[Dict[str, Any]]):
    """
    Saves a batch of features to V3_ML_Feature_Store.
    Each feature dict must contain: fixture_id, league_id, and the feature vector.
    """
    if not features:
        return

    db_path = get_db_path()
    
    try:
        # We don't use PRAGMA query_only = ON here because we need to write
        conn = sqlite3.connect(f"file:{db_path}?mode=rw", uri=True)
        conn.execute("PRAGMA journal_mode=WAL")
        cursor = conn.cursor()

        insert_sql = """
            INSERT OR REPLACE INTO V3_ML_Feature_Store (fixture_id, league_id, feature_vector)
            VALUES (?, ?, ?)
        """
        
        # Prepare data for bulk insert
        data = [
            (
                f['fixture_id'], 
                f['league_id'], 
                json.dumps(f['features'])
            ) 
            for f in features
        ]

        cursor.executemany(insert_sql, data)
        conn.commit()
        conn.close()
        
        logger.debug(f"Successfully saved {len(features)} features to store.")
    except Exception as e:
        logger.error(f"Failed to save feature batch: {e}")
        raise

def delete_league_features(league_id: int):
    """
    Clears the feature store for a specific league (Manual Override - US_031).
    """
    db_path = get_db_path()
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=rw", uri=True)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM V3_ML_Feature_Store WHERE league_id = ?", (league_id,))
        conn.commit()
        conn.close()
        logger.info(f"Cleared feature store for league {league_id}")
    except Exception as e:
        logger.error(f"Failed to clear league features: {e}")
        raise
