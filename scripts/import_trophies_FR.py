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

    # =========================
    # France (custom imports)
    # =========================
    'Championnat de France / Ligue 1': 'Ligue 1',
    'Championnat de France / Ligue 2': 'Ligue 2',
    'Championnat de France Ligue 2 (niveau 2)': 'Ligue 2',
    'Championnat de France Ligue 2 (niveau 2)': 'Ligue 2',
    'Ligue 2': 'Ligue 2',
    'Coupe de France': 'Coupe de France',
    'Coupe de la Ligue': 'Coupe de la Ligue',
    'Trophée des Champions': 'Trophée des Champions',
    'Ligue des Champions / European Cup': 'UEFA Champions League',
    'UEFA Cup Winners’ Cup': 'UEFA Cup Winners\' Cup',
}


# Built-in example dataset (France clubs) so you can run a quick import without
# creating a separate file.
EXAMPLE_DATA_FRANCE_TSV = """\
Auxerre\tChampionnat de France / Ligue 1\t1995–96
Auxerre\tCoupe de France\t1993–94
Auxerre\tCoupe de France\t1995–96
Auxerre\tCoupe de France\t2002–03
Auxerre\tCoupe de France\t2004–05
Auxerre\tCoupe de la Ligue\t1995–96
Auxerre\tTrophée des Champions\t1996
Angers SCO\tChampionnat de France Ligue 2 (niveau 2)\t1968–69
Angers SCO\tChampionnat de France Ligue 2 (niveau 2)\t1975–76
AS Monaco\tLigue 1\t1960–61
AS Monaco\tLigue 1\t1962–63
AS Monaco\tLigue 1\t1977–78
AS Monaco\tLigue 1\t1981–82
AS Monaco\tLigue 1\t1987–88
AS Monaco\tLigue 1\t1996–97
AS Monaco\tLigue 1\t1999–2000
AS Monaco\tLigue 1\t2016–17
AS Monaco\tCoupe de France\t1960–61
AS Monaco\tCoupe de France\t1962–63
AS Monaco\tCoupe de France\t1979–80
AS Monaco\tCoupe de France\t1984–85
AS Monaco\tCoupe de France\t1990–91
AS Monaco\tCoupe de France\t1991–92
AS Monaco\tCoupe de la Ligue\t2002–03
AS Monaco\tTrophée des Champions\t1961
AS Monaco\tTrophée des Champions\t1985
AS Monaco\tTrophée des Champions\t1997
AS Monaco\tTrophée des Champions\t2000
AS Monaco\tTrophée des Champions\t2017
Stade Brestois 29\tLigue 2\t1980–81
Stade Brestois 29\tCoupe Gambardella\t1990
Le Havre AC\tChampionnat de France / Ligue 2\t1990–91
Le Havre AC\tChampionnat de France / Ligue 2\t1993–94
Le Havre AC\tChampionnat de France / Ligue 2\t2007–08
Le Havre AC\tChampionnat de France / Ligue 2\t2017–18
Lille OSC\tLigue 1\t1945–46
Lille OSC\tLigue 1\t1953–54
Lille OSC\tLigue 1\t2010–11
Lille OSC\tLigue 1\t2020–21
Lille OSC\tCoupe de France\t1945–46
Lille OSC\tCoupe de France\t1946–47
Lille OSC\tCoupe de France\t1947–48
Lille OSC\tCoupe de France\t1952–53
Lille OSC\tCoupe de France\t1954–55
Lille OSC\tCoupe de France\t2010–11
Lille OSC\tTrophée des Champions\t1946
Lille OSC\tTrophée des Champions\t1955
Lille OSC\tTrophée des Champions\t2021
RC Lens\tLigue 1\t1997–98
RC Lens\tLigue 2\t1936–37
RC Lens\tLigue 2\t1948–49
RC Lens\tLigue 2\t1972–73
RC Lens\tCoupe de France\t1998–99
RC Lens\tCoupe de la Ligue\t1998–99
RC Lens\tTrophée des Champions\t1998
FC Lorient\tCoupe de France\t2001–02
FC Lorient\tCoupe de la Ligue\t2001–02
FC Lorient\tLigue 2\t1994–95
FC Lorient\tLigue 2\t2005–06
Olympique Lyonnais\tLigue 1\t2001–02
Olympique Lyonnais\tLigue 1\t2002–03
Olympique Lyonnais\tLigue 1\t2003–04
Olympique Lyonnais\tLigue 1\t2004–05
Olympique Lyonnais\tLigue 1\t2005–06
Olympique Lyonnais\tLigue 1\t2006–07
Olympique Lyonnais\tLigue 1\t2007–08
Olympique Lyonnais\tLigue 1\t2008–09
Olympique Lyonnais\tCoupe de France\t1963–64
Olympique Lyonnais\tCoupe de France\t1966–67
Olympique Lyonnais\tCoupe de France\t1972–73
Olympique Lyonnais\tCoupe de France\t2007–08
Olympique Lyonnais\tCoupe de France\t2011–12
Olympique Lyonnais\tCoupe de la Ligue\t2000–01
Olympique Lyonnais\tTrophée des Champions\t1973
Olympique Lyonnais\tTrophée des Champions\t2002
Olympique Lyonnais\tTrophée des Champions\t2003
Olympique Lyonnais\tTrophée des Champions\t2004
Olympique Lyonnais\tTrophée des Champions\t2005
Olympique Lyonnais\tTrophée des Champions\t2006
Olympique Lyonnais\tTrophée des Champions\t2007
Olympique Lyonnais\tTrophée des Champions\t2012
Olympique de Marseille\tLigue 1\t1936–37
Olympique de Marseille\tLigue 1\t1947–48
Olympique de Marseille\tLigue 1\t1970–71
Olympique de Marseille\tLigue 1\t1971–72
Olympique de Marseille\tLigue 1\t1988–89
Olympique de Marseille\tLigue 1\t1989–90
Olympique de Marseille\tLigue 1\t1990–91
Olympique de Marseille\tLigue 1\t1991–92
Olympique de Marseille\tLigue 1\t1992–93
Olympique de Marseille\tLigue 1\t1993–94
Olympique de Marseille\tCoupe de France\t1923–24
Olympique de Marseille\tCoupe de France\t1924–25
Olympique de Marseille\tCoupe de France\t1925–26
Olympique de Marseille\tCoupe de France\t1926–27
Olympique de Marseille\tCoupe de France\t1934–35
Olympique de Marseille\tCoupe de France\t1937–38
Olympique de Marseille\tCoupe de France\t1942–43
Olympique de Marseille\tCoupe de France\t1968–69
Olympique de Marseille\tCoupe de France\t1971–72
Olympique de Marseille\tCoupe de France\t1975–76
Olympique de Marseille\tCoupe de France\t1988–89
Olympique de Marseille\tCoupe de France\t1989–90
Olympique de Marseille\tCoupe de France\t1990–91
Olympique de Marseille\tCoupe de France\t1991–92
Olympique de Marseille\tCoupe de France\t1998–99
Olympique de Marseille\tCoupe de France\t2005–06
Olympique de Marseille\tCoupe de la Ligue\t2010–11
Olympique de Marseille\tCoupe de la Ligue\t2011–12
Olympique de Marseille\tCoupe de la Ligue\t2012–13
Olympique de Marseille\tTrophée des Champions\t1971
Olympique de Marseille\tTrophée des Champions\t2010
Olympique de Marseille\tTrophée des Champions\t2011
Olympique de Marseille\tTrophée des Champions\t2012
Olympique de Marseille\tTrophée des Champions\t2013
Olympique de Marseille\tLigue des Champions / European Cup\t1992–93
FC Metz\tLigue 2\t1933–34
FC Metz\tLigue 2\t2006–07
FC Metz\tCoupe de France\t1983–84
FC Metz\tCoupe de France\t1987–88
FC Metz\tCoupe de la Ligue\t1995–96
FC Metz\tTrophée des Champions\t1984
FC Nantes\tLigue 1\t1964–65
FC Nantes\tLigue 1\t1965–66
FC Nantes\tLigue 1\t1972–73
FC Nantes\tLigue 1\t1976–77
FC Nantes\tLigue 1\t1979–80
FC Nantes\tLigue 1\t1982–83
FC Nantes\tLigue 1\t1994–95
FC Nantes\tLigue 1\t2000–01
FC Nantes\tCoupe de France\t1978–79
FC Nantes\tCoupe de France\t1998–99
FC Nantes\tCoupe de France\t1999–2000
FC Nantes\tCoupe de la Ligue\t1964–65
FC Nantes\tTrophée des Champions\t1965
FC Nantes\tTrophée des Champions\t1966
FC Nantes\tTrophée des Champions\t1973
FC Nantes\tTrophée des Champions\t1977
FC Nantes\tTrophée des Champions\t1999
OGC Nice\tLigue 1\t1950–51
OGC Nice\tLigue 1\t1951–52
OGC Nice\tLigue 1\t1955–56
OGC Nice\tLigue 1\t1958–59
OGC Nice\tCoupe de France\t1951–52
OGC Nice\tCoupe de France\t1953–54
OGC Nice\tCoupe de France\t1963–64
OGC Nice\tTrophée des Champions\t1952
OGC Nice\tTrophée des Champions\t1956
Paris Saint-Germain\tLigue 1\t1985–86
Paris Saint-Germain\tLigue 1\t1993–94
Paris Saint-Germain\tLigue 1\t2012–13
Paris Saint-Germain\tLigue 1\t2013–14
Paris Saint-Germain\tLigue 1\t2014–15
Paris Saint-Germain\tLigue 1\t2015–16
Paris Saint-Germain\tLigue 1\t2017–18
Paris Saint-Germain\tLigue 1\t2018–19
Paris Saint-Germain\tLigue 1\t2019–20
Paris Saint-Germain\tLigue 1\t2021–22
Paris Saint-Germain\tLigue 1\t2022–23
Paris Saint-Germain\tCoupe de France\t1981–82
Paris Saint-Germain\tCoupe de France\t1982–83
Paris Saint-Germain\tCoupe de France\t1992–93
Paris Saint-Germain\tCoupe de France\t1994–95
Paris Saint-Germain\tCoupe de France\t1997–98
Paris Saint-Germain\tCoupe de France\t2003–04
Paris Saint-Germain\tCoupe de France\t2005–06
Paris Saint-Germain\tCoupe de France\t2009–10
Paris Saint-Germain\tCoupe de France\t2014–15
Paris Saint-Germain\tCoupe de France\t2015–16
Paris Saint-Germain\tCoupe de France\t2016–17
Paris Saint-Germain\tCoupe de France\t2017–18
Paris Saint-Germain\tCoupe de France\t2019–20
Paris Saint-Germain\tCoupe de France\t2020–21
Paris Saint-Germain\tCoupe de France\t2022–23
Paris Saint-Germain\tCoupe de la Ligue\t1994–95
Paris Saint-Germain\tCoupe de la Ligue\t1997–98
Paris Saint-Germain\tCoupe de la Ligue\t2007–08
Paris Saint-Germain\tCoupe de la Ligue\t2013–14
Paris Saint-Germain\tCoupe de la Ligue\t2014–15
Paris Saint-Germain\tCoupe de la Ligue\t2015–16
Paris Saint-Germain\tCoupe de la Ligue\t2016–17
Paris Saint-Germain\tCoupe de la Ligue\t2017–18
Paris Saint-Germain\tTrophée des Champions\t1995
Paris Saint-Germain\tTrophée des Champions\t1998
Paris Saint-Germain\tTrophée des Champions\t2013
Paris Saint-Germain\tTrophée des Champions\t2014
Paris Saint-Germain\tTrophée des Champions\t2015
Paris Saint-Germain\tTrophée des Champions\t2016
Paris Saint-Germain\tTrophée des Champions\t2017
Paris Saint-Germain\tTrophée des Champions\t2018
Paris Saint-Germain\tTrophée des Champions\t2019
Paris Saint-Germain\tTrophée des Champions\t2020
Paris Saint-Germain\tTrophée des Champions\t2022
Paris Saint-Germain\tUEFA Cup Winners’ Cup\t1995–96
Stade Rennais\tCoupe de France\t1964–65
Stade Rennais\tCoupe de France\t1970–71
Stade Rennais\tCoupe de France\t2018–19
Stade Rennais\tTrophée des Champions\t1971
RC Strasbourg\tLigue 1\t1978–79
RC Strasbourg\tLigue 2\t1938–39
RC Strasbourg\tLigue 2\t1965–66
RC Strasbourg\tCoupe de France\t1950–51
RC Strasbourg\tCoupe de France\t1965–66
RC Strasbourg\tCoupe de France\t2000–01
RC Strasbourg\tCoupe de la Ligue\t1997–98
RC Strasbourg\tTrophée des Champions\t1979
Toulouse FC\tCoupe de France\t1956–57
Toulouse FC\tCoupe de France\t1970–71
Toulouse FC\tLigue 2\t1953–54
Toulouse FC\tLigue 2\t1981–82
Toulouse FC\tLigue 2\t1982–83
Toulouse FC\tLigue 2\t2002–03
Toulouse FC\tLigue 2\t2006–07
"""

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
    parser.add_argument('--example-france', action='store_true',
                       help='Use the built-in France example dataset (ignores --file/stdin)')
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
    if args.example_france:
        data_lines = [ln + "\n" for ln in EXAMPLE_DATA_FRANCE_TSV.splitlines() if ln.strip()]
        args.delimiter = '\t'
    elif args.file:
        with open(args.file, 'r', encoding='utf-8') as f:
            data_lines = f.readlines()
    else:
        # Read from stdin
        data_lines = sys.stdin.readlines()
    
    # Import trophies
    import_trophies(data_lines, args.delimiter)


if __name__ == '__main__':
    main()
