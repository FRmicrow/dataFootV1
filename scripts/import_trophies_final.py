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
import sqlite3
from os import path

DB_PATH = path.join(path.dirname(__file__), '..', 'backend', 'database.sqlite')

# Competition name mappings (handle variations)
COMPETITION_MAPPINGS = {
    # --- International / European (variants -> DB canonical) ---
    'Coupe Intercontinentale': 'FIFA Intercontinental Cup',
    'Intercontinental Cup': 'FIFA Intercontinental Cup',
    'Coupe du Monde des Clubs': 'FIFA Club World Cup',
    'FIFA Club World Cup': 'FIFA Club World Cup',

    'UEFA Champions League': 'UEFA Champions League',
    'UCL': 'UEFA Champions League',
    'Champions League': 'UEFA Champions League',
    'Ligue des Champions': 'UEFA Champions League',
    'Ligue des Champions / Coupe d’Europe': 'UEFA Champions League',
    'UEFA Champions League / European Cup': 'UEFA Champions League',
    'European Cup / Ligue des champions (UEFA Champions League)': 'UEFA Champions League',

    'UEFA Europa League': 'UEFA Europa League',
    'Europa League': 'UEFA Europa League',
    'UEL': 'UEFA Europa League',
    'UEFA Cup': 'UEFA Europa League',
    'Coupe UEFA': 'UEFA Europa League',
    'UEFA Cup (C3)': 'UEFA Europa League',
    'UEFA Europa League / UEFA Cup': 'UEFA Europa League',
    'UEFA Cup / UEFA Europa League': 'UEFA Europa League',

    "UEFA Cup Winners’ Cup": "UEFA Cup Winners Cup",
    "UEFA Cup Winners' Cup": "UEFA Cup Winners Cup",
    'Coupe des Vainqueurs de Coupe': "UEFA Cup Winners Cup",
    'Coupe des coupes (UEFA Cup Winners’ Cup)': "UEFA Cup Winners Cup",
    "European Cup Winners’ Cup (UEFA)": "UEFA Cup Winners Cup",

    'UEFA Super Cup': 'UEFA Super Cup',
    'UEFA Supercup': 'UEFA Super Cup',
    "Supercoupe de l’UEFA": 'UEFA Super Cup',
    "Supercoupe de l'UEFA": 'UEFA Super Cup',

    'UEFA Europa Conference League': 'UEFA Europa Conference League',
    'Europa Conference League': 'UEFA Europa Conference League',

    'UEFA Intertoto Cup': 'UEFA Intertoto Cup',
    'Coupe Intertoto': 'UEFA Intertoto Cup',
    'UEFA Intertoto Cup (compétition européenne officielle)': 'UEFA Intertoto Cup',

    'Inter‑Cities Fairs Cup': 'Inter-Cities Fairs Cup',
    'Inter-Cities Fairs Cup': 'Inter-Cities Fairs Cup',
    'Coupe des villes de foires (Inter-Cities Fairs Cup)': 'Inter-Cities Fairs Cup',

    # --- France ---
    'Championnat de France / Ligue 1': 'Ligue 1',
    'Ligue 1': 'Ligue 1',
    'Championnat de France / Ligue 2': 'Ligue 2',
    'Championnat de France Ligue 2 (niveau 2)': 'Ligue 2',
    'Ligue 2': 'Ligue 2',
    'Coupe de France': 'Coupe de France',
    'Coupe de la Ligue': 'Coupe de la Ligue',
    'Trophée des Champions': 'Trophée des Champions',
    'Ligue des Champions / European Cup': 'UEFA Champions League',

    # --- Germany ---
    'Bundesliga': 'Bundesliga',
    '2. Bundesliga (D2)': '2. Bundesliga',
    '2. Bundesliga Nord': '2. Bundesliga',
    'Regionalliga Süd (D3)': 'Regionalliga',
    'Regionalliga Nord (D3/D4)': 'Regionalliga',
    'Regionalliga Nord (D2/D3)': 'Regionalliga',
    'Bayernliga': 'Bayernliga',
    'DFB-Pokal': 'DFB-Pokal',
    'DFB‑Pokal (Coupe d’Allemagne)': 'DFB-Pokal',
    "DFB‑Pokal (Coupe d'Allemagne)": 'DFB-Pokal',
    'DFL-Supercup': 'DFL-Supercup',
    'DFL‑Supercup (Supercoupe d’Allemagne)': 'DFL-Supercup',
    "DFL‑Supercup (Supercoupe d'Allemagne)": 'DFL-Supercup',

    # --- Italy ---
    'Serie A': 'Serie A',
    'Serie B': 'Serie B',
    'Serie C': 'Serie C',
    'Serie C1 / Serie C': 'Serie C',
    'Serie C1 / Lega Pro': 'Serie C',
    'Serie C2 / Lega Pro Seconda Divisione': 'Serie C',
    'Coppa Italia': 'Coppa Italia',
    'Supercoppa Italiana': 'Supercoppa Italiana',
    'Coupe Mitropa': 'Mitropa Cup',

    # --- Portugal ---
    'Primeira Liga': 'Primeira Liga',
    'Taça de Portugal': 'Taça de Portugal',
    'Taça da Liga': 'Taça da Liga',
    'Supertaça Cândido de Oliveira': 'Supertaça Cândido de Oliveira',
    'Segunda Liga / Liga Portugal 2 (D2)': 'Liga Portugal 2',
    'Segunda Divisão / Liga Portugal 2 (D2)': 'Liga Portugal 2',
    'Taça da Madeira': 'Taça da Madeira',

    # --- England ---
    'Premier League': 'Premier League',
    'Championnat d’Angleterre': 'Premier League',
    "Championnat d'Angleterre": 'Premier League',
    'Championnat d’Angleterre / Premier League': 'Premier League',
    'Premier League / First Division': 'Premier League',
    'Championnat d’Angleterre / First Division': 'Premier League',
    'Football League First Division / Championnat d’Angleterre': 'Premier League',
    'Championnat d’Angleterre (Premier League / First Division)': 'Premier League',
    'Championnat d’Angleterre / First Division / Premier League': 'Premier League',
    'English First Division (championnat d’Angleterre)': 'Premier League',

    'FA Cup': 'FA Cup',

    'EFL Cup': 'EFL Cup',
    'Football League Cup': 'EFL Cup',
    'Football League Cup / EFL Cup': 'EFL Cup',
    'League Cup (EFL Cup)': 'EFL Cup',
    'League Cup (Football League Cup / EFL Cup)': 'EFL Cup',
    'EFL Cup / League Cup': 'EFL Cup',

    'FA Community Shield': 'FA Community Shield',
    'FA Charity Shield': 'FA Community Shield',
    'FA Charity Shield / Community Shield': 'FA Community Shield',
    'FA Charity Shield / FA Community Shield': 'FA Community Shield',
    'FA Community Shield / English Supercup': 'FA Community Shield',
    'FA Community Shield (Charity Shield)': 'FA Community Shield',
    'FA Community/Charity Shield': 'FA Community Shield',

    'Championship / Second Division': 'English Football League Championship',

    'Third Division / League One (niveau 3)': 'EFL League One',
    'Football League Third Division / League One (championnat tiers 3)': 'EFL League One',
    'Football League Third Division / League One (championnat niveau 3)': 'EFL League One',
    'Football League One (championnat tiers 3)': 'EFL League One',
    'English Third Division South (Champions)': 'EFL League One',
    'English Third Division / League One (championnat niveau 3)': 'EFL League One',

    'Fourth Division / League Two (niveau 4)': 'EFL League Two',
    'Football League Fourth Division / League Two (championnat tiers 4)': 'EFL League Two',

    "Full Members' Cup": "Full Members' Cup",
    'Football League Trophy': 'EFL Trophy',

    'Anglo‑Scottish Cup': 'Anglo-Scottish Cup',
    
    # Missing explicit mappings found in logs
    'FA Community Shield / Charity Shield': 'FA Community Shield',
    'UEFA Cup Winners’ Cup': 'UEFA Cup Winners Cup',
    'Championship / Second Division': 'English Football League Championship',
    'Championship / Division Two (niveau 2)': 'English Football League Championship',
    'Second Division / Championship': 'English Football League Championship',
    'Second Division (championnat niveau 2)': 'English Football League Championship',
    'English Second Division / Championship (championnat niveau 2)': 'English Football League Championship',
    'English Second Division / EFL Championship (Champions)': 'English Football League Championship',
    "Football League Second Division / Championship (championnat tiers 2) – Runners‑up": 'English Football League Championship',
    'Football League Second Division / Championship (championnat niveau 2)': 'English Football League Championship',
    'Football League Second Division / Championship (championnat niveau 2)': 'English Football League Championship',
    
    'Football League Cup / League Cup': 'EFL Cup',
    'Football League Cup (EFL Cup)': 'EFL Cup',
    'Football League Cup': 'EFL Cup',
    
    'Football League Third Division / League One (championnat niveau 3)': 'EFL League One',
    'Football League Third Division / League One (championnat niveau 3)': 'EFL League One',
    'Football League Third Division South / League One (championnat tiers 3)': 'EFL League One',
    'English Third Division South (Champions)': 'EFL League One',
    'Football League One (championnat tiers 3)': 'EFL League One',
    'Third Division / League One (niveau 3)': 'EFL League One',
    
    'Football League Fourth Division / League Two (championnat tiers 4)': 'EFL League Two',
    'Fourth Division / League Two (niveau 4)': 'EFL League Two',
    
    'European Cup Winners’ Cup': 'UEFA Cup Winners Cup',
    'European Cup Winners’ Cup (UEFA)': 'UEFA Cup Winners Cup',
    'Coupe des coupes (UEFA Cup Winners’ Cup)': 'UEFA Cup Winners Cup',
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
    
    # Remove parenthetical notes like (partagé), (shared), (Champions)
    # Split by '(' and take the first part
    if '(' in season_input:
        season_input = season_input.split('(')[0].strip()

    # Replace en-dash with hyphen
    season_normalized = season_input.replace('–', '-')
    
    # Check if it's a season range (e.g., "2022-23")
    if '-' in season_normalized:
        parts = season_normalized.split('-')
        start_year = int(parts[0])
        end_year_short = int(parts[1])
        
        # Handle 2-digit end year
        if end_year_short < 100:
            # Revised logic: Treat 00-29 as 2000s, 30-99 as 1900s
            # This better fits football history where 1930-1999 is common
            if end_year_short < 30:
                end_year = 2000 + end_year_short
            else:
                end_year = 1900 + end_year_short
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


# Club name aliases (Input -> Canonical DB Name)
CLUB_ALIASES = {
    'Milan': 'AC Milan',
    'Inter': 'Inter Milan',
    'Internazionale': 'Inter Milan',
    'Steaua': 'Steaua Bucharest',
    'Zaragoza': 'Real Zaragoza',
    'Real Zaragoza': 'Real Zaragoza',
    'Atletico Madrid': 'Atlético Madrid',
    'PSV': 'PSV Eindhoven',
    'Sporting CP': 'Sporting CP',
    'Sporting Lisbon': 'Sporting CP',
    'Man Utd': 'Manchester United',
    'Man City': 'Manchester City',
    'PSG': 'Paris Saint-Germain',
    'Saint-Étienne': 'AS Saint-Étienne',
    'St Etienne': 'AS Saint-Étienne',
    'Marseille': 'Olympique de Marseille',
    'Lyon': 'Olympique Lyonnais',
    'Monaco': 'AS Monaco',
    'Tottenham': 'Tottenham Hotspur',
    'West Ham': 'West Ham United'
}

# ============================================
# Database Functions
# ============================================

def get_db_connection():
    """Create database connection."""
    try:
        connection = sqlite3.connect(DB_PATH)
        return connection
    except sqlite3.Error as e:
        print(f"Error connecting to SQLite: {e}")
        sys.exit(1)


def get_or_create_club(cursor, club_name: str) -> int:
    """Get club_id or create new club if it doesn't exist."""
    
    # Resolve alias
    club_name = CLUB_ALIASES.get(club_name, club_name)
    
    # Try to find existing club
    cursor.execute(
        "SELECT club_id FROM V2_clubs WHERE club_name = ?",
        (club_name,)
    )
    result = cursor.fetchone()
    
    if result:
        return result[0]
    
    # Create new club with minimal info
    print(f"  ⚠️  Creating new club: {club_name}")
    # Defaulting to France/Unknown (1) if needed due to constraint
    cursor.execute("SELECT country_id FROM V2_countries WHERE country_name = 'France'")
    fr_res = cursor.fetchone()
    default_cid = fr_res[0] if fr_res else 1

    cursor.execute("""
        INSERT INTO V2_clubs (club_name, club_short_name, country_id, is_active)
        VALUES (?, ?, ?, 1)
    """, (club_name, club_name, default_cid))
    
    return cursor.lastrowid


def get_competition_id(cursor, competition_name: str) -> Optional[int]:
    """Get competition_id by name or short name."""
    normalized_name = normalize_competition_name(competition_name)
    
    # Try exact match on competition_name
    cursor.execute(
        "SELECT competition_id FROM V2_competitions WHERE competition_name = ?",
        (normalized_name,)
    )
    result = cursor.fetchone()
    if result:
        return result[0]
    
    # Try exact match on short_name
    cursor.execute(
        "SELECT competition_id FROM V2_competitions WHERE competition_short_name = ?",
        (normalized_name,)
    )
    result = cursor.fetchone()
    if result:
        return result[0]
    
    # Try LIKE match
    cursor.execute(
        "SELECT competition_id FROM V2_competitions WHERE competition_name LIKE ? LIMIT 1",
        (f"%{normalized_name}%",)
    )
    result = cursor.fetchone()
    if result:
        return result[0]
    
    return None


def insert_trophy(cursor, club_id: int, competition_id: int, season: str, year: int) -> bool:
    """Insert trophy into club_trophies table."""
    try:
        # SQLite doesn't support ON DUPLICATE KEY UPDATE in same syntax, use ON CONFLICT
        # Assuming constraint is on (club_id, competition_id, year) or similar unique index
        # If no unique index, it will just insert duplicates which is fine for now or we check existence.
        # Let's assume (club_id, competition_id, year) is unique for 'winner'.
        
        # Check if exists
        cursor.execute("SELECT 1 FROM V2_club_trophies WHERE club_id=? AND competition_id=? AND year=?", (club_id, competition_id, year))
        if cursor.fetchone():
             # Update
             cursor.execute("UPDATE V2_club_trophies SET season=? WHERE club_id=? AND competition_id=? AND year=?", (season, club_id, competition_id, year))
        else:
             cursor.execute("""
                INSERT INTO V2_club_trophies (club_id, competition_id, season, year, is_runner_up)
                VALUES (?, ?, ?, ?, 0)
            """, (club_id, competition_id, season, year))
        return True
    except sqlite3.Error as e:
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
