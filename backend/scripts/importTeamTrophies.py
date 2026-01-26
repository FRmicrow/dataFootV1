import requests
from bs4 import BeautifulSoup
import re
import sqlite3
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database.sqlite')

# Competition name mapping
COMPETITION_MAPPING = {
    # Championships  
    "Championnat d'Italie": {"name": "Serie A", "type": "championship"},
    "Championnat d'Espagne": {"name": "La Liga", "type": "championship"},
    "Championnat d'Angleterre": {"name": "Premier League", "type": "championship"},
    "Championnat d'Allemagne": {"name": "Bundesliga", "type": "championship"},
    "Championnat de France": {"name": "Ligue 1", "type": "championship"},
    
    # National Cups
    "Coupe d'Italie": {"name": "Coppa Italia", "type": "national_cup"},
    "Supercoupe d'Italie": {"name": "Supercoppa Italiana", "type": "national_cup"},
    "Coupe d'Espagne": {"name": "Copa del Rey", "type": "national_cup"},
    "Supercoupe d'Espagne": {"name": "Supercopa de España", "type": "national_cup"},
    "Coupe d'Angleterre": {"name": "FA Cup", "type": "national_cup"},
    "Coupe de la Ligue anglaise": {"name": "EFL Cup", "type": "national_cup"},
    "Coupe d'Allemagne": {"name": "DFB-Pokal", "type": "national_cup"},
    "Supercoupe d'Allemagne": {"name": "DFL-Supercup", "type": "national_cup"},
    "Coupe de France": {"name": "Coupe de France", "type": "national_cup"},
    "Coupe de la Ligue": {"name": "Coupe de la Ligue", "type": "national_cup"},
    
    # International Cups
    "Ligue des champions": {"name": "UEFA Champions League", "type": "international_cup"},
    "Coupe des clubs champions européens": {"name": "UEFA Champions League", "type": "international_cup"},
    "Ligue Europa": {"name": "UEFA Europa League", "type": "international_cup"},
    "Coupe UEFA": {"name": "UEFA Cup", "type": "international_cup"},
    "Supercoupe d'Europe": {"name": "UEFA Super Cup", "type": "international_cup"},
    "Coupe intercontinentale": {"name": "Intercontinental Cup", "type": "international_cup"},
    "Coupe du monde des clubs de la FIFA": {"name": "FIFA Club World Cup", "type": "international_cup"},
}

def get_or_create_season(cursor, year):
    """Get or create a season for a given year"""
    # Match year to season (e.g., 2010 = 2009-2010 season)
    cursor.execute('SELECT id FROM seasons WHERE year = ?', (year,))
    season = cursor.fetchone()
    
    if not season:
        label = f"{year-1}-{year}"
        cursor.execute('INSERT INTO seasons (year, label) VALUES (?, ?)', (year, label))
        return cursor.lastrowid
    return season['id']

def scrape_and_store_trophies(club_name, wikipedia_url):
    """Scrape Wikipedia and store trophies in database with years"""
    
    print(f"\n{'='*70}")
    print(f"🏆 ADVANCED WIKIPEDIA TROPHY SCRAPER (WITH YEARS)")
    print(f"{'='*70}")
    print(f"🔍 Club: {club_name}")
    print(f"📄 URL: {wikipedia_url}")
    print(f"{'='*70}\n")
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Find club in database - try exact match first, then fuzzy
    cursor.execute('SELECT id, name FROM clubs WHERE name = ?', (club_name,))
    club = cursor.fetchone()
    
    if not club:
        # Try fuzzy match but exclude Miami
        cursor.execute('SELECT id, name FROM clubs WHERE name LIKE ? AND name NOT LIKE "%Miami%"', (f'%{club_name}%',))
        club = cursor.fetchone()
    
    if not club:
        print(f"❌ Club '{club_name}' not found in database")
        conn.close()
        return False
    
    club_id = club['id']
    club_name_db = club['name']
    print(f"✓ Found club: {club_name_db} (ID: {club_id})\n")
    
    # Fetch Wikipedia page
    try:
        response = requests.get(wikipedia_url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
    except Exception as e:
        print(f"❌ Error fetching page: {e}")
        conn.close()
        return False
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    print("🔍 Looking for detailed trophy lists with years...\n")
    
    # Stats
    trophies_created = 0
    team_trophies_added = 0
    seasons_created = 0
    
    # Find all list items that contain trophy information
    for li in soup.find_all('li'):
        text = li.get_text()
        
        # Look for trophy patterns like "Champion : 1910, 1920, 1930" or "Vainqueur : 1939, 1978"
        for comp_fr, mapping in COMPETITION_MAPPING.items():
            if comp_fr in text:
                # Check if this is a winners list (Champion/Vainqueur)
                if 'Champion' in text or 'Vainqueur' in text or 'Victoire' in text:
                    # Extract years from links
                    years = []
                    for link in li.find_all('a'):
                        year_text = link.get_text().strip()
                        # Extract 4-digit year
                        year_match = re.search(r'(\d{4})', year_text)
                        if year_match:
                            years.append(int(year_match.group(1)))
                    
                    if years:
                        # Get or create trophy
                        cursor.execute('SELECT id FROM trophies WHERE name = ?', (mapping['name'],))
                        trophy = cursor.fetchone()
                        
                        if not trophy:
                            cursor.execute('INSERT INTO trophies (name, type) VALUES (?, ?)',
                                         (mapping['name'], mapping['type']))
                            trophy_id = cursor.lastrowid
                            trophies_created += 1
                            print(f"  ✨ Created trophy type: {mapping['name']}")
                        else:
                            trophy_id = trophy['id']
                        
                        # Add team trophies for each year
                        for year in years:
                            # Get or create season
                            season_id = get_or_create_season(cursor, year)
                            if cursor.rowcount > 0:  # New season was created
                                seasons_created += 1
                            
                            # Check if team_trophy already exists
                            cursor.execute(
                                'SELECT id FROM team_trophies WHERE team_id = ? AND trophy_id = ? AND season_id = ?',
                                (club_id, trophy_id, season_id)
                            )
                            if not cursor.fetchone():
                                cursor.execute(
                                    'INSERT INTO team_trophies (team_id, trophy_id, season_id, place) VALUES (?, ?, ?, ?)',
                                    (club_id, trophy_id, season_id, 'Winner')
                                )
                                team_trophies_added += 1
                        
                        print(f"  ✓ {mapping['name']}: Added {len(years)} titles ({min(years)} - {max(years)})")
    
    # Commit changes
    conn.commit()
    conn.close()
    
    print(f"\n{'='*70}")
    print(f"📊 FINAL SUMMARY")
    print(f"{'='*70}")
    print(f"  New trophy types created: {trophies_created}")
    print(f"  New seasons created: {seasons_created}")
    print(f"  Team trophies added: {team_trophies_added}")
    print(f"{'='*70}\n")
    
    if team_trophies_added > 0:
        print(f"✅ Successfully stored {team_trophies_added} trophies in 'team_trophies' table!")
    else:
        print(f"⚠️  No trophies were added to team_trophies table")
    
    print(f"{'='*70}\n")
    
    return True

if __name__ == "__main__":
    print("\n" + "="*70)
    print("  WIKIPEDIA TROPHY SCRAPER - INTER MILAN (WITH YEARS)")
    print("="*70)
    
    success = scrape_and_store_trophies(
        "Inter",
        "https://fr.wikipedia.org/wiki/FC_Internazionale_Milano"
    )
    
    if success:
        print("✅ Trophy data successfully imported!")
    else:
        print("❌ Failed to import trophies")
