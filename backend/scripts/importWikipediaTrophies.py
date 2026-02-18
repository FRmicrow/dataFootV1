import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests
from bs4 import BeautifulSoup
import re

# Import database after adding to path
import importlib
db_module = importlib.import_module('src.config.database')
db = db_module.default

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
    "Supercoupe d'Italie": {"name": "Super Copa di Italia", "type": "national_cup"},
    "Coupe d'Espagne": {"name": "Copa del Rey", "type": "national_cup"},
    "Supercoupe d'Espagne": {"name": "Supercopa de España", "type": "national_cup"},
    "Coupe d'Angleterre": {"name": "FA Cup", "type": "national_cup"},
    "Coupe de la Ligue anglaise": {"name": "League Cup", "type": "national_cup"},
    "Coupe d'Allemagne": {"name": "DFB-Pokal", "type": "national_cup"},
    "Supercoupe d'Allemagne": {"name": "DFL-Supercup", "type": "national_cup"},
    "Coupe de France": {"name": "Coupe de France", "type": "national_cup"},
    "Coupe de la Ligue": {"name": "Coupe de la Ligue", "type": "national_cup"},
    
    # International Cups
    "Ligue des champions": {"name": "UEFA Champions League", "type": "international_cup"},
    "Ligue Europa": {"name": "UEFA Europa League", "type": "international_cup"},
    "Coupe UEFA": {"name": "UEFA Cup", "type": "international_cup"},
    "Supercoupe d'Europe": {"name": "UEFA Super Cup", "type": "international_cup"},
    "Coupe intercontinentale": {"name": "Intercontinental Cup", "type": "international_cup"},
    "Coupe du monde des clubs de la FIFA": {"name": "FIFA Club World Cup", "type": "international_cup"},
    "Supercoupe intercontinentale": {"name": "Intercontinental Super Cup", "type": "international_cup"},
    "Coupe Mitropa": {"name": "Mitropa Cup", "type": "international_cup"},
    "Internacional Copa Mohammed-V": {"name": "Copa Mohammed V", "type": "international_cup"},
    "Coupe des clubs champions européens": {"name": "European Cup", "type": "international_cup"},
}

def scrape_and_store_trophies(club_name, wikipedia_url):
    """Scrape Wikipedia and store trophies in database"""
    
    print(f"\n{'='*60}")
    print(f"🔍 Processing: {club_name}")
    print(f"📄 URL: {wikipedia_url}")
    print(f"{'='*60}\n")
    
    # Initialize database
    db.init()
    
    # Find club in database
    club = db.get('SELECT id, name FROM clubs WHERE name LIKE ?', [f'%{club_name}%'])
    
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
    
    # Track stats
    trophies_added = 0
    trophies_created = 0
    
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
                        
                        # Get or create trophy
                        trophy = db.get('SELECT id FROM trophies WHERE name = ?', [mapped['name']])
                        
                        if not trophy:
                            result = db.run('INSERT INTO trophies (name, type) VALUES (?, ?)', 
                                          [mapped['name'], mapped['type']])
                            trophy_id = result['lastInsertRowid']
                            trophies_created += 1
                            print(f"  ✨ Created trophy: {mapped['name']}")
                        else:
                            trophy_id = trophy['id']
                        
                        # For now, we'll create team_trophy records without specific seasons
                        # We'll use a generic "multiple wins" approach by creating one record per win
                        # with consecutive season IDs (this is a simplification)
                        print(f"  ✓ {competition_name_fr} -> {mapped['name']}: {count} titles")
                        
                        # Note: We can't insert into team_trophies without season_id
                        # The table requires: team_id, trophy_id, season_id
                        # Wikipedia doesn't provide year-by-year data in the main table
                        
                        trophies_added += count
    
    print(f"\n{'='*60}")
    print(f"📊 Summary:")
    print(f"  New trophy types created: {trophies_created}")
    print(f"  Total trophy wins found: {trophies_added}")
    print(f"  ⚠️  Note: Trophy data extracted but not inserted into team_trophies")
    print(f"  (team_trophies requires season_id which Wikipedia doesn't provide)")
    print(f"{'='*60}\n")
    
    return True

if __name__ == "__main__":
    # Test with Inter Milan
    success = scrape_and_store_trophies(
        "Inter",
        "https://fr.wikipedia.org/wiki/FC_Internazionale_Milano"
    )
    
    if success:
        print("✅ Successfully processed Inter Milan trophies")
        print("\n💡 Next steps:")
        print("  1. Trophy types have been added to 'trophies' table")
        print("  2. To populate team_trophies, you need year-by-year data")
        print("  3. Consider scraping detailed trophy history sections")
    else:
        print("\n❌ Failed to process trophies")
