#!/usr/bin/env python3
"""
Club Trophy Import Script
Imports club trophy data into the football database.

Input format (tab-separated or CSV):
Club Name    Competition Name    Season/Year
Bayern Munich    Bundesliga    2022–23
Bayern Munich    DFB-Pokal    1956–57
Bayern Munich    DFL-Supercup    1987

Usage:
    python import_trophies.py --file trophies.txt --delimiter "\t"
    python import_trophies.py --file trophies.csv --delimiter ","
    
Or pipe data directly:
    cat trophies.txt | python import_trophies.py --delimiter "\t"
"""

import sys
import re
import argparse
from typing import List, Tuple, Optional
import mysql.connector
from mysql.connector import Error

# ============================================
# Configuration
# ============================================

DB_CONFIG = {
    'host': 'localhost',
    'database': 'football_db',
    'user': 'your_username',
    'password': 'your_password'
}

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
}

# ============================================
# Helper Functions
# ============================================

def parse_season_year(season_input: str) -> Tuple[str, int]:
    """
    Parse season input and return (season_string, year_int).
    
    Examples:
        "2022-23" -> ("2022-23", 2023)
        "2022–23" -> ("2022-23", 2023)
        "1987" -> ("1987", 1987)
        "1956-57" -> ("1956-57", 1957)
    """
    season_input = season_input.strip()
    
    # Replace en-dash with hyphen
    season_normalized = season_input.replace('–', '-')
    
    # Check if it's a season range (e.g., "2022-23")
    if '-' in season_normalized:
        parts = season_normalized.split('-')
        start_year = int(parts[0])
        end_year_short = int(parts[1])
        
        # Handle 2-digit end year
        if end_year_short < 100:
            if end_year_short < 50:
                end_year = 2000 + end_year_short
            else:
                # For historical seasons like 1956-57
                century = (start_year // 100) * 100
                end_year = century + end_year_short
                # If end year is less than start year, it's next century
                if end_year < start_year:
                    end_year += 100
        else:
            end_year = end_year_short
        
        return (season_normalized, end_year)
    else:
        # Just a year
        year = int(season_normalized)
        return (season_normalized, year)


def normalize_competition_name(name: str) -> str:
    """Normalize competition name using mappings."""
    name = name.strip()
    return COMPETITION_MAPPINGS.get(name, name)


def parse_trophy_line(line: str, delimiter: str = '\t') -> Optional[Tuple[str, str, str]]:
    """
    Parse a line of trophy data.
    Returns (club_name, competition_name, season) or None if invalid.
    """
    line = line.strip()
    if not line or line.startswith('#'):
        return None
    
    parts = [p.strip() for p in line.split(delimiter)]
    
    if len(parts) < 3:
        return None
    
    club_name = parts[0]
    competition_name = parts[1]
    season = parts[2]
    
    if not club_name or not competition_name or not season:
        return None
    
    return (club_name, competition_name, season)


# ============================================
# Database Functions
# ============================================

def get_db_connection():
    """Create database connection."""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        sys.exit(1)


def get_or_create_club(cursor, club_name: str) -> int:
    """Get club_id or create new club if it doesn't exist."""
    # Try to find existing club
    cursor.execute(
        "SELECT club_id FROM clubs WHERE club_name = %s",
        (club_name,)
    )
    result = cursor.fetchone()
    
    if result:
        return result[0]
    
    # Create new club with minimal info
    print(f"  ⚠️  Creating new club: {club_name}")
    cursor.execute("""
        INSERT INTO clubs (club_name, club_short_name, country_id, is_active)
        VALUES (%s, %s, NULL, TRUE)
    """, (club_name, club_name))
    
    return cursor.lastrowid


def get_competition_id(cursor, competition_name: str) -> Optional[int]:
    """Get competition_id by name or short name."""
    normalized_name = normalize_competition_name(competition_name)
    
    # Try exact match on competition_name
    cursor.execute(
        "SELECT competition_id FROM competitions WHERE competition_name = %s",
        (normalized_name,)
    )
    result = cursor.fetchone()
    if result:
        return result[0]
    
    # Try exact match on short_name
    cursor.execute(
        "SELECT competition_id FROM competitions WHERE competition_short_name = %s",
        (normalized_name,)
    )
    result = cursor.fetchone()
    if result:
        return result[0]
    
    # Try LIKE match
    cursor.execute(
        "SELECT competition_id FROM competitions WHERE competition_name LIKE %s LIMIT 1",
        (f"%{normalized_name}%",)
    )
    result = cursor.fetchone()
    if result:
        return result[0]
    
    return None


def insert_trophy(cursor, club_id: int, competition_id: int, season: str, year: int) -> bool:
    """Insert trophy into club_trophies table."""
    try:
        cursor.execute("""
            INSERT INTO club_trophies (club_id, competition_id, season, year, is_runner_up)
            VALUES (%s, %s, %s, %s, FALSE)
            ON DUPLICATE KEY UPDATE season = VALUES(season), year = VALUES(year)
        """, (club_id, competition_id, season, year))
        return True
    except Error as e:
        print(f"  ❌ Error inserting trophy: {e}")
        return False


# ============================================
# Main Import Function
# ============================================

def import_trophies(data_lines: List[str], delimiter: str = '\t'):
    """Import trophies from list of data lines."""
    
    connection = get_db_connection()
    cursor = connection.cursor()
    
    stats = {
        'total': 0,
        'inserted': 0,
        'skipped': 0,
        'errors': 0,
        'unmapped_competitions': set()
    }
    
    print("\n🏆 Starting trophy import...\n")
    
    for line_num, line in enumerate(data_lines, 1):
        parsed = parse_trophy_line(line, delimiter)
        
        if not parsed:
            continue
        
        club_name, competition_name, season_input = parsed
        stats['total'] += 1
        
        print(f"[{stats['total']}] {club_name} - {competition_name} - {season_input}")
        
        try:
            # Parse season
            season, year = parse_season_year(season_input)
            
            # Get or create club
            club_id = get_or_create_club(cursor, club_name)
            
            # Get competition
            competition_id = get_competition_id(cursor, competition_name)
            
            if not competition_id:
                print(f"  ⚠️  Competition not found: {competition_name}")
                stats['unmapped_competitions'].add(competition_name)
                stats['skipped'] += 1
                continue
            
            # Insert trophy
            if insert_trophy(cursor, club_id, competition_id, season, year):
                print(f"  ✅ Inserted: {club_name} - {competition_name} ({year})")
                stats['inserted'] += 1
            else:
                stats['errors'] += 1
                
        except Exception as e:
            print(f"  ❌ Error processing line {line_num}: {e}")
            stats['errors'] += 1
            continue
    
    # Commit all changes
    connection.commit()
    
    # Print summary
    print("\n" + "="*60)
    print("📊 IMPORT SUMMARY")
    print("="*60)
    print(f"Total records processed: {stats['total']}")
    print(f"✅ Successfully inserted: {stats['inserted']}")
    print(f"⚠️  Skipped (unmapped): {stats['skipped']}")
    print(f"❌ Errors: {stats['errors']}")
    
    if stats['unmapped_competitions']:
        print("\n⚠️  UNMAPPED COMPETITIONS:")
        for comp in sorted(stats['unmapped_competitions']):
            print(f"   - {comp}")
        print("\nPlease add these competitions to the 'competitions' table.")
    
    print("="*60 + "\n")
    
    cursor.close()
    connection.close()


# ============================================
# CLI Interface
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description='Import club trophies into football database',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Import from file
  python import_trophies.py --file trophies.txt --delimiter "\\t"
  
  # Import from CSV
  python import_trophies.py --file trophies.csv --delimiter ","
  
  # Import from stdin
  cat trophies.txt | python import_trophies.py --delimiter "\\t"
  
  # Import with custom database config
  python import_trophies.py --file trophies.txt --host localhost --db football_db --user root
        """
    )
    
    parser.add_argument('--file', '-f', type=str, help='Input file path')
    parser.add_argument('--delimiter', '-d', type=str, default='\t', 
                       help='Field delimiter (default: tab)')
    parser.add_argument('--host', type=str, help='Database host')
    parser.add_argument('--db', type=str, help='Database name')
    parser.add_argument('--user', '-u', type=str, help='Database user')
    parser.add_argument('--password', '-p', type=str, help='Database password')
    
    args = parser.parse_args()
    
    # Update DB config if provided
    if args.host:
        DB_CONFIG['host'] = args.host
    if args.db:
        DB_CONFIG['database'] = args.db
    if args.user:
        DB_CONFIG['user'] = args.user
    if args.password:
        DB_CONFIG['password'] = args.password
    
    # Read input data
    if args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            data_lines = f.readlines()
    else:
        # Read from stdin
        data_lines = sys.stdin.readlines()
    
    # Import trophies
    import_trophies(data_lines, args.delimiter)


if __name__ == '__main__':
    main()
