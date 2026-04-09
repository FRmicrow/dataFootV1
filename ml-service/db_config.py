"""
Shared PostgreSQL connection helper for the ML service.
Reads DATABASE_URL from environment (set by Docker Compose).
Falls back to localhost for local development.

Usage:
    from db_config import get_connection

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT ...", (param,))
    rows = cursor.fetchall()
    conn.close()

psycopg2 differences:
  - Placeholders use %s instead of ?
  - conn.execute() is NOT available directly; use cursor = conn.cursor()
  - row_factory: psycopg2 returns tuples by default;
    use psycopg2.extras.RealDictCursor to get dict-like rows
"""

import os
import psycopg2
import psycopg2.extras
import warnings

# Suppress pandas warning about non-SQLAlchemy connections.
warnings.filterwarnings('ignore', category=UserWarning, module='pandas')

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://statfoot_user:statfoot_password@localhost:5432/statfoot'
)

def get_connection(use_dict_cursor: bool = False):
    """
    Return a psycopg2 connection to the PostgreSQL database.

    Args:
        use_dict_cursor: If True, rows are returned as dicts (RealDictRow).
                         If False (default), rows are plain tuples.
    """
    conn = psycopg2.connect(DATABASE_URL)
    if use_dict_cursor:
        # Patch cursor_factory so cursor() returns RealDictCursor automatically
        conn.cursor_factory = psycopg2.extras.RealDictCursor
    return conn
