import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests
from bs4 import BeautifulSoup
import re
from src.config.database import default as db

# Competition name mapping and categories (same as before)
COMPETITION_MAPPING = {
    # Championships
    "Championnat d'Italie": {"name": "Serie A", "category": "championship", "country": "Italy"},
    "Championnat d'Espagne": {"name": "La Liga", "category": "championship", "country": "Spain"},
    "Championnat d'Angleterre": {"name": "Premier League", "category": "championship", "country": "England"},
    "Championnat d'Allemagne": {"name": "Bundesliga", "category": "championship", "country": "Germany"},
    "Championnat de France": {"name": "Ligue 1", "category": "championship", "country": "France"},
    
    # National Cups
    "Coupe d'Italie": {"name": "Coppa Italia", "category": "national_cup", "country": "Italy"},
    "Supercoupe d'Italie": {"name": "Supercoppa Italiana", "category": "national_cup", "country": "Italy"},
    "Coupe d'Espagne": {"name": "Copa del Rey", "category": "national_cup", "country": "Spain"},
    "Supercoupe d'Espagne": {"name": "Supercopa de España", "category": "national_cup", "country": "Spain"},
    "Coupe d'Angleterre": {"name": "FA Cup", "category": "national_cup", "country": "England"},
    "Coupe de la Ligue anglaise": {"name": "EFL Cup", "category": "national_cup", "country": "England"},
    "Coupe d'Allemagne": {"name": "DFB-Pokal", "category": "national_cup", "country": "Germany"},
    "Supercoupe d'Allemagne": {"name": "DFL-Supercup", "category": "national_cup", "country": "Germany"},
    "Coupe de France": {"name": "Coupe de France", "category": "national_cup", "country": "France"},
    "Coupe de la Ligue": {"name": "Coupe de la Ligue", "category": "national_cup", "country": "France"},
    
    # International Cups
    "Ligue des champions": {"name": "UEFA Champions League", "category": "international_cup", "country": None},
    "Ligue Europa": {"name": "UEFA Europa League", "category": "international_cup", "country": None},
    "Coupe UEFA": {"name": "UEFA Cup", "category": "international_cup", "country": None},
    "Supercoupe d'Europe": {"name": "UEFA Super Cup", "category": "international_cup", "country": None},
    "Coupe intercontinentale": {"name": "Intercontinental Cup", "category": "international_cup", "country": None},
    "Coupe du monde des clubs de la FIFA": {"name": "FIFA Club World Cup", "category": "international_cup", "country": None},
    "Supercoupe intercontinentale": {"name": "Intercontinental Super Cup", "category": "international_cup", "country": None},
    "Coupe Mitropa": {"name": "Mitropa Cup", "category": "international_cup", "country": None},
    "Internacional Copa Mohammed-V": {"name": "Copa Mohammed V", "category": "international_cup", "country": None},
    "Coupe des clubs champions européens": {"name": "European Cup", "category": "international_cup", "country": None},
}

def scrape_and_store_trophies(club_name, wikipedia_url):
    """Scrape Wikipedia and store trophies in database"""
    
    print(f"\n🔍 Processing: {club_name}")
    print(f"📄 URL: {wikipedia_url}\n")
    
    # Initialize database
    db.init()
    
    # Find club in database
    club = db.get('SELECT id, name FROM clubs WHERE name LIKE ?', [f'%{club_name}%'])
    
    if not club:
        # Try alternative names
        alternatives = {
            "Inter": "Inter%",
            "Milan": "%Milan%",
            "Juventus": "Juventus%",
        }
        if club_name in alternatives:
            club = db.get('SELECT id, name FROM clubs WHERE name LIKE ?', [alternatives[club_name]])
    
    if not club:
        print(f"❌ Club '{club_name}' not found in database")
        return False
    
    print(f"✓ Found club in database: {club['name']} (ID: {club['id']})\n")
    
    # Fetch Wikipedia page
    try:
        response = requests.get(wikipedia_url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
    except Exception as e:
        print(f"❌ Error fetching page: {e}")
        return False
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find Palmarès table
    palmares_table = None
    for table in soup.find_all('table'):
        caption = table.find('caption')
        if caption and 'Palmarès principal' in caption.get_text():
            palmares_table = table
            break
    
    if not palmares_table:
        print("⚠️ Palmarès principal table not found")
        return False
    
    print("✓ Found Palmarès principal table\n")
    
    # Track added trophies
    trophies_added = 0
    competitions_created = 0
    
    # Parse table
    for row in palmares_table.find_all('tr'):
        cells = row.find_all(['th', 'td'])
        if len(cells) >= 2:
            content_cell = cells[1]
            content_html = str(content_cell)
            segments = re.split(r'<br\s*/?>', content_html)
            
            for segment in segments:
                segment_soup = BeautifulSoup(segment, 'html.parser')
                
                for link in segment_soup.find_all('a'):
                    competition_name_fr = link.get_text().strip()
                    parent_text = segment_soup.get_text()
                    
                    match = re.search(rf'{re.escape(competition_name_fr)}\s*\((\d+)\)', parent_text)
                    if match and competition_name_fr in COMPETITION_MAPPING:
                        count = int(match.group(1))
                        mapped = COMPETITION_MAPPING[competition_name_fr]
                        
                        # Get or create competition
                        comp_id = get_or_create_competition(
                            mapped['name'],
                            mapped['category'],
                            mapped.get('country')
                        )
                        
                        if comp_id:
                            competitions_created += 1
                            print(f"✓ {competition_name_fr} -> {mapped['name']} ({count} titles)")
                            trophies_added += count
                        else:
                            print(f"⚠️ Could not create competition: {mapped['name']}")
    
    print(f"\n📊 Summary:")
    print(f"  Competitions registered: {competitions_created}")
    print(f"  Total trophies: {trophies_added}")
    
    return True

def get_or_create_competition(name, category, country_name):
    """Get or create a competition in the database"""
    
    # Determine table based on category
    if category == 'championship':
        table = 'championships'
    elif category == 'national_cup':
        table = 'national_cups'
    elif category == 'international_cup':
        table = 'international_cups'
    else:
        return None
    
    # Check if competition exists
    existing = db.get(f'SELECT id FROM {table} WHERE name = ?', [name])
    if existing:
        return existing['id']
    
    # Get country_id if needed
    country_id = None
    if country_name:
        country = db.get('SELECT id FROM countries WHERE name = ?', [country_name])
        if country:
            country_id = country['id']
        else:
            print(f"  ⚠️ Country '{country_name}' not found")
            return None
    
    # Create competition
    if category == 'championship' and country_id:
        result = db.run(f'INSERT INTO {table} (name, country_id) VALUES (?, ?)', [name, country_id])
        return result['lastInsertRowid']
    elif category == 'national_cup' and country_id:
        result = db.run(f'INSERT INTO {table} (name, country_id) VALUES (?, ?)', [name, country_id])
        return result['lastInsertRowid']
    elif category == 'international_cup':
        result = db.run(f'INSERT INTO {table} (name) VALUES (?)', [name])
        return result['lastInsertRowid']
    
    return None

if __name__ == "__main__":
    # Test with Inter Milan
    success = scrape_and_store_trophies(
        "Inter",
        "https://fr.wikipedia.org/wiki/FC_Internazionale_Milano"
    )
    
    if success:
        print("\n✅ Successfully processed Inter Milan trophies")
    else:
        print("\n❌ Failed to process trophies")
