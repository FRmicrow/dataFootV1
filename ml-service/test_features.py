import pytest
import pandas as pd
import sqlite3
import json
import os
from time_travel import TemporalFeatureFactory

@pytest.fixture
def mock_db():
    conn = sqlite3.connect(":memory:")
    conn.execute("""
        CREATE TABLE V3_Fixtures (
            fixture_id INTEGER PRIMARY KEY,
            league_id INTEGER,
            season_year INTEGER,
            date DATETIME,
            home_team_id INTEGER,
            away_team_id INTEGER,
            goals_home INTEGER,
            goals_away INTEGER,
            status_short TEXT
        )
    """)
    # Use dates without times to avoid off-by-one hour diffs
    matches = [
        (1, 1, 2023, "2023-01-01 00:00:00", 10, 11, 2, 0, "FT"),
        (2, 1, 2023, "2023-01-02 00:00:00", 11, 10, 0, 2, "FT"), 
        (3, 1, 2023, "2023-01-09 00:00:00", 10, 12, 1, 1, "FT"),
        (4, 1, 2023, "2023-01-16 00:00:00", 13, 10, 0, 3, "FT"),
    ]
    conn.executemany("INSERT INTO V3_Fixtures (fixture_id, league_id, season_year, date, home_team_id, away_team_id, goals_home, goals_away, status_short) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", matches)
    conn.commit()
    return conn

def test_rest_days(mock_db):
    factory = TemporalFeatureFactory(":memory:")
    # Last match was Jan 2. Today is Jan 9. Diff = 7 days.
    rest_days = factory._get_rest_days(conn=mock_db, team_id=10, match_date="2023-01-09 00:00:00")
    assert rest_days == 7.0

def test_momentum_and_win_rate(mock_db):
    factory = TemporalFeatureFactory(":memory:")
    # Team 10 plays 3 games before Jan 16: Win, Win, Draw.
    mom = factory._get_team_momentum(conn=mock_db, team_id=10, match_date="2023-01-16 00:00:00")
    
    # 2 Wins and 1 Draw -> 0.666...
    assert round(mom['win_5'], 2) == 0.67
    assert round(mom['pts_3'], 2) == 2.33
