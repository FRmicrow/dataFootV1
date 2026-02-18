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
    
    print(f"\n{'='*70}")
    print(f"🏆 WIKIPEDIA TROPHY SCRAPER")
    print(f"{'='*70}")
    print(f"🔍 Club: {club_name}")
    print(f"📄 URL: {wikipedia_url}")
    print(f"{'='*70}\n")
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Find club in database
    cursor.execute('SELECT id, name FROM clubs WHERE name LIKE ?', (f'%{club_name}%',))
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
    
    # Find Palmarès table
    palmares_table = None
    for table in soup.find_all('table'):
        caption = table.find('caption')
        if caption and 'Palmarès principal' in caption.get_text():
            palmares_table = table
            break
    
    if not palmares_table:
        print("⚠️ Palmarès principal table not found")
        conn.close()
        return False
    
    print("✓ Found Palmarès principal table\n")
    print("📝 Extracting trophies...\n")
    
    # Track stats
    trophies_created = 0
    total_wins = 0
    trophy_details = []
    
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
                        cursor.execute('SELECT id FROM trophies WHERE name = ?', (mapped['name'],))
                        trophy = cursor.fetchone()
                        
                        if not trophy:
                            cursor.execute('INSERT INTO trophies (name, type) VALUES (?, ?)', 
                                         (mapped['name'], mapped['type']))
                            trophy_id = cursor.lastrowid
                            trophies_created += 1
                            status = "✨ CREATED"
                        else:
                            trophy_id = trophy['id']
                            status = "✓ EXISTS"
                        
                        trophy_details.append({
                            'name': mapped['name'],
                            'type': mapped['type'],
                            'count': count,
                            'status': status
                        })
                        
                        print(f"  {status}: {mapped['name']} ({mapped['type']}) - {count} titles")
                        total_wins += count
    
    # Commit changes
    conn.commit()
    conn.close()
    
    print(f"\n{'='*70}")
    print(f"📊 SUMMARY")
    print(f"{'='*70}")
    print(f"  New trophy types created: {trophies_created}")
    print(f"  Total trophy wins found: {total_wins}")
    print(f"  Trophy types found: {len(trophy_details)}")
    
    # Group by type
    by_type = {}
    for t in trophy_details:
        typ = t['type']
        by_type[typ] = by_type.get(typ, 0) + t['count']
    
    print(f"\n  By category:")
    for typ, count in sorted(by_type.items()):
        print(f"    • {typ}: {count} titles")
    
    print(f"\n{'='*70}")
    print(f"\n✅ Trophy types added to 'trophies' table")
    print(f"⚠️  Note: team_trophies table not populated (requires season data)")
    print(f"{'='*70}\n")
    
    return True

if __name__ == "__main__":
    print("\n" + "="*70)
    print("  WIKIPEDIA TROPHY SCRAPER - INTER MILAN")
    print("="*70)
    
    success = scrape_and_store_trophies(
        "Inter",
        "https://fr.wikipedia.org/wiki/FC_Internazionale_Milano"
    )
    
    if success:
        print("✅ Successfully processed trophy data!")
    else:
        print("❌ Failed to process trophies")
