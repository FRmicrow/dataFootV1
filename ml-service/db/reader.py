"""
db/reader.py — Read-only SQLite access for the Python ML service.

Architecture contract:
  • Node.js WRITES to backend/database.sqlite.
  • Python READS from the same file (PRAGMA query_only = ON).
  • Never call conn.execute() with INSERT/UPDATE/DELETE here.

We use the stdlib sqlite3 module (not SQLAlchemy) for minimal overhead.
Pandas integration is provided via read_sql_leakproof() which enforces
the anti-leakage date filter at the query layer.
"""

import sqlite3
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

from config import DB_PATH

logger = logging.getLogger(__name__)


def _get_connection() -> sqlite3.Connection:
    """
    Open a read-only connection to the shared SQLite database.

    Using check_same_thread=False is safe here because we never write,
    and sqlite3 allows concurrent reads on WAL-mode databases.
    """
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Database not found at: {DB_PATH}\n"
            "Make sure the Node backend has been started at least once."
        )

    conn = sqlite3.connect(
        str(DB_PATH),
        check_same_thread=False,
        timeout=10,
    )
    # Row factory so rows behave like dicts
    conn.row_factory = sqlite3.Row

    # Enforce strict read-only mode — any write attempt raises OperationalError
    conn.execute("PRAGMA query_only = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")   # non-blocking reads

    return conn


def fetch_df(sql: str, params: tuple = ()) -> pd.DataFrame:
    """
    Execute `sql` with `params` and return the result as a Pandas DataFrame.

    Example
    -------
    df = fetch_df(
        "SELECT * FROM V3_Fixtures WHERE league_id = ? AND date < ?",
        (39, "2024-05-10")
    )
    """
    conn = _get_connection()
    try:
        df = pd.read_sql_query(sql, conn, params=params)
        logger.debug("fetch_df: %d rows returned", len(df))
        return df
    finally:
        conn.close()


def fetch_one(sql: str, params: tuple = ()) -> Optional[sqlite3.Row]:
    """Return the first matching row or None."""
    conn = _get_connection()
    try:
        cur = conn.execute(sql, params)
        return cur.fetchone()
    finally:
        conn.close()


def fetch_all(sql: str, params: tuple = ()) -> list:
    """Return all matching rows as a list of sqlite3.Row objects."""
    conn = _get_connection()
    try:
        cur = conn.execute(sql, params)
        return cur.fetchall()
    finally:
        conn.close()


def table_exists(table_name: str) -> bool:
    """Check whether a table exists in the database."""
    row = fetch_one(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    )
    return row is not None


def get_db_path() -> Path:
    """Expose the resolved DB path (for logging / health checks)."""
    return DB_PATH
