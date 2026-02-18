#!/usr/bin/env python3
"""
Club Trophy Import Script (SQLite Version)
Imports club trophy data into the football database (V2 Schema).

Input format (tab-separated):
Club Name    Competition Name    Season/Year
"""

import sys
import sqlite3
import re
import argparse
from typing import List, Tuple, Optional
from os import path

# Configuration
DB_PATH = path.join(path.dirname(__file__), '..', 'database.sqlite')

# Competition name mappings (handle variations)
COMPETITION_MAPPINGS = {
    'Coupe Intercontinentale': 'FIFA Intercontinental Cup',
    'Coupe du Monde des Clubs': 'FIFA Club World Cup',
    'UEFA Champions League': 'UEFA Champions League',
    'UCL': 'UEFA Champions League',
    'Champions League': 'UEFA Champions League',
    'Europa League': 'UEFA Europa League',
    'UEL': 'UEFA Europa League',
    'Premier League': 'Premier League',
    'La Liga': 'La Liga',
    'Serie A': 'Serie A',
    'Bundesliga': 'Bundesliga',
    'Ligue 1': 'Ligue 1',
    'DFB-Pokal': 'DFB-Pokal',
    'DFL-Supercup': 'German Super Cup',
    'UEFA Super Cup': 'UEFA Super Cup',
    # Add more as needed
}

def parse_season_year(season_input: str) -> Tuple[str, int]:
    season_input = season_input.strip()
    season_normalized = season_input.replace('–', '-')
    
    if '-' in season_normalized:
        parts = season_normalized.split('-')
        try:
            start_year = int(parts[0])
            end_year_short = int(parts[1])
            if end_year_short < 100:
                if end_year_short < 50:
                    end_year = 2000 + end_year_short
                else:
                    century = (start_year // 100) * 100
                    end_year = century + end_year_short
                    if end_year < start_year:
                        end_year += 100
            else:
                end_year = end_year_short
            return (season_normalized, end_year)
        except ValueError:
             return (season_normalized, 0)
    else:
        try:
            year = int(season_normalized)
            return (season_normalized, year)
        except ValueError:
            return (season_normalized, 0)

def normalize_competition_name(name: str) -> str:
    name = name.strip()
    return COMPETITION_MAPPINGS.get(name, name)

def parse_trophy_line(line: str, delimiter: str = '\t') -> Optional[Tuple[str, str, str]]:
    line = line.strip()
    if not line or line.startswith('#') or line.startswith('--'):
        return None
    
    parts = [p.strip() for p in line.split(delimiter)]
    if len(parts) < 3:
        return None
    return (parts[0], parts[1], parts[2])

def get_db_connection():
    try:
        conn = sqlite3.connect(DB_PATH)
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to SQLite: {e}")
        sys.exit(1)

def get_or_create_club(cursor, club_name: str) -> int:
    cursor.execute("SELECT club_id FROM V2_clubs WHERE club_name = ?", (club_name,))
    result = cursor.fetchone()
    if result:
        return result[0]
    
    print(f"  ⚠️  Creating new club: {club_name} (Warning: Defaulting Country ID to satisfy NOT NULL constraint)")
    # Defaults to France or 1 if not confirmed
    cursor.execute("SELECT country_id FROM V2_countries WHERE country_name = 'France'")
    fr_res = cursor.fetchone()
    default_cid = fr_res[0] if fr_res else 1

    cursor.execute("INSERT INTO V2_clubs (club_name, club_short_name, country_id, is_active) VALUES (?, ?, ?, 1)", (club_name, club_name, default_cid))
    return cursor.lastrowid

def get_competition_id(cursor, competition_name: str) -> Optional[int]:
    normalized_name = normalize_competition_name(competition_name)
    
    # Exact Name
    cursor.execute("SELECT competition_id FROM V2_competitions WHERE competition_name = ?", (normalized_name,))
    result = cursor.fetchone()
    if result: return result[0]
    
    # Short Name
    cursor.execute("SELECT competition_id FROM V2_competitions WHERE competition_short_name = ?", (normalized_name,))
    result = cursor.fetchone()
    if result: return result[0]
    
    # Like
    cursor.execute("SELECT competition_id FROM V2_competitions WHERE competition_name LIKE ? LIMIT 1", (f"%{normalized_name}%",))
    result = cursor.fetchone()
    if result: return result[0]
    
    return None

def insert_trophy(cursor, club_id: int, competition_id: int, season: str, year: int) -> bool:
    try:
        # V2_club_trophies UNIQUE constraint is (club_id, competition_id, year)
        cursor.execute("""
            INSERT INTO V2_club_trophies (club_id, competition_id, season, year, is_runner_up)
            VALUES (?, ?, ?, ?, 0)
            ON CONFLICT(club_id, competition_id, year) DO UPDATE SET season=excluded.season
        """, (club_id, competition_id, season, year))
        return True
    except sqlite3.Error as e:
        print(f"  ❌ Error inserting trophy: {e}")
        return False

def import_trophies(data_lines: List[str], delimiter: str = '\t'):
    conn = get_db_connection()
    cursor = conn.cursor()
    stats = {'total': 0, 'inserted': 0, 'skipped': 0, 'errors': 0}
    
    print("\n🏆 Starting trophy import (SQLite V2)...\n")
    
    for line in data_lines:
        parsed = parse_trophy_line(line, delimiter)
        if not parsed: continue
        
        club_name, comp_name, season_raw = parsed
        stats['total'] += 1
        
        season, year = parse_season_year(season_raw)
        if year == 0:
            print(f"  ❌ Invalid year format: {season_raw}")
            stats['errors'] += 1
            continue

        try:
            club_id = get_or_create_club(cursor, club_name)
            comp_id = get_competition_id(cursor, comp_name)
            
            if not comp_id:
                print(f"  ⚠️  Competition not found: {comp_name}")
                stats['skipped'] += 1
                continue
                
            if insert_trophy(cursor, club_id, comp_id, season, year):
                print(f"  ✅ {club_name} - {comp_name} ({year})")
                stats['inserted'] += 1
            else:
                stats['errors'] += 1
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            stats['errors'] += 1
            
    conn.commit()
    conn.close()
    print(f"\nDonne. Processed: {stats['total']}, Inserted: {stats['inserted']}, Skipped: {stats['skipped']}, Errors: {stats['errors']}\n")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', '-f', type=str)
    parser.add_argument('--delimiter', '-d', type=str, default='\t')
    args = parser.parse_args()
    
    if args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    else:
        lines = sys.stdin.readlines()
        
    import_trophies(lines, args.delimiter)
