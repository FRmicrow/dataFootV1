import requests
from bs4 import BeautifulSoup
import re
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'config'))

# We'll use requests and BeautifulSoup for scraping
# Run: pip install requests beautifulsoup4

# Competition name mapping (French to English) and categories
COMPETITION_MAPPING = {
    # Championships
    "Championnat d'Italie": {"name": "Serie A", "category": "championship"},
    "Championnat d'Espagne": {"name": "La Liga", "category": "championship"},
    "Championnat d'Angleterre": {"name": "Premier League", "category": "championship"},
    "Championnat d'Allemagne": {"name": "Bundesliga", "category": "championship"},
    "Championnat de France": {"name": "Ligue 1", "category": "championship"},
    
    # National Cups
    "Coupe d'Italie": {"name": "Coppa Italia", "category": "national_cup"},
    "Supercoupe d'Italie": {"name": "Supercoppa Italiana", "category": "national_cup"},
    "Coupe d'Espagne": {"name": "Copa del Rey", "category": "national_cup"},
    "Supercoupe d'Espagne": {"name": "Supercopa de España", "category": "national_cup"},
    "Coupe d'Angleterre": {"name": "FA Cup", "category": "national_cup"},
    "Coupe de la Ligue anglaise": {"name": "EFL Cup", "category": "national_cup"},
    "Coupe d'Allemagne": {"name": "DFB-Pokal", "category": "national_cup"},
    "Supercoupe d'Allemagne": {"name": "DFL-Supercup", "category": "national_cup"},
    "Coupe de France": {"name": "Coupe de France", "category": "national_cup"},
    "Coupe de la Ligue": {"name": "Coupe de la Ligue", "category": "national_cup"},
    
    # International Cups
    "Ligue des champions": {"name": "UEFA Champions League", "category": "international_cup"},
    "Ligue Europa": {"name": "UEFA Europa League", "category": "international_cup"},
    "Coupe UEFA": {"name": "UEFA Cup", "category": "international_cup"},
    "Supercoupe d'Europe": {"name": "UEFA Super Cup", "category": "international_cup"},
    "Coupe intercontinentale": {"name": "Intercontinental Cup", "category": "international_cup"},
    "Coupe du monde des clubs de la FIFA": {"name": "FIFA Club World Cup", "category": "international_cup"},
    "Supercoupe intercontinentale": {"name": "Intercontinental Super Cup", "category": "international_cup"},
    "Coupe Mitropa": {"name": "Mitropa Cup", "category": "international_cup"},
    "Internacional Copa Mohammed-V": {"name": "Copa Mohammed V", "category": "international_cup"},
    "Coupe des clubs champions européens": {"name": "European Cup", "category": "international_cup"},
}

# Club name variations for fuzzy matching
CLUB_NAME_VARIATIONS = {
    "Inter": ["FC Internazionale Milano", "Inter Milan", "Internazionale", "Inter Milano"],
    "AC Milan": ["Milan AC", "Associazione Calcio Milan", "Milan"],
    "Juventus": ["Juventus FC", "Juventus Football Club"],
    "Barcelona": ["FC Barcelona", "FC Barcelone", "Barça"],
    "Real Madrid": ["Real Madrid CF", "Real Madrid Club de Fútbol"],
    "Bayern München": ["Bayern Munich", "FC Bayern München", "Bayern Munich"],
    "Manchester United": ["Manchester United FC", "Man United", "Man Utd"],
    "Liverpool": ["Liverpool FC"],
    "Paris Saint Germain": ["Paris Saint-Germain", "PSG", "Paris SG"],
}

def normalize_club_name(wiki_name):
    """Convert Wikipedia club name to our database name"""
    # Remove common prefixes/suffixes
    cleaned = wiki_name.replace("FC ", "").replace(" FC", "").replace("_", " ").strip()
    
    # Check against variations
    for db_name, variations in CLUB_NAME_VARIATIONS.items():
        if cleaned in variations or wiki_name in variations:
            return db_name
        # Partial match
        for variant in variations:
            if variant.lower() in wiki_name.lower() or wiki_name.lower() in variant.lower():
                return db_name
    
    return cleaned

def extract_trophies_from_palmares(soup):
    """Extract trophies from the Palmarès section"""
    trophies = []
    
    # Find the Palmarès principal table
    palmares_table = None
    for table in soup.find_all('table'):
        caption = table.find('caption')
        if caption and 'Palmarès principal' in caption.get_text():
            palmares_table = table
            break
    
    if not palmares_table:
        print("⚠️ Palmarès principal table not found")
        return trophies
    
    print("✓ Found Palmarès principal table\n")
    
    # Parse table rows
    for row in palmares_table.find_all('tr'):
        cells = row.find_all(['th', 'td'])
        if len(cells) >= 2:
            header = cells[0].get_text().strip()
            content_cell = cells[1]
            
            # Get all text from the cell and split by <br> tags
            content_html = str(content_cell)
            segments = re.split(r'<br\s*/?>', content_html)
            
            for segment in segments:
                # Parse HTML segment
                segment_soup = BeautifulSoup(segment, 'html.parser')
                
                # Find all links (trophy names)
                for link in segment_soup.find_all('a'):
                    competition_name = link.get_text().strip()
                    
                    # Get the surrounding text to find the count
                    parent_text = segment_soup.get_text()
                    
                    # Extract count from pattern "Trophy Name (count)"
                    match = re.search(rf'{re.escape(competition_name)}\s*\((\d+)\)', parent_text)
                    if match:
                        count = int(match.group(1))
                        
                        # Map to our competition system
                        if competition_name in COMPETITION_MAPPING:
                            mapped = COMPETITION_MAPPING[competition_name]
                            trophies.append({
                                'original_name': competition_name,
                                'competition_name': mapped['name'],
                                'category': mapped['category'],
                                'count': count,
                                'section': header
                            })
                            print(f"✓ Found: {competition_name} ({count}) -> {mapped['name']} [{mapped['category']}]")
                        else:
                            print(f"⚠️ Unknown competition: {competition_name} ({count})")
    
    return trophies

def scrape_wikipedia_trophies(url):
    """Scrape trophies from a Wikipedia club page"""
    print(f"\n🔍 Scraping: {url}\n")
    
    # Extract club name from URL
    wiki_club_name = url.split('/')[-1].replace('_', ' ')
    db_club_name = normalize_club_name(wiki_club_name)
    
    print(f"📋 Wikipedia name: {wiki_club_name}")
    print(f"🎯 Matched to: {db_club_name}\n")
    
    # Fetch the page
    try:
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
    except Exception as e:
        print(f"❌ Error fetching page: {e}")
        return None
    
    # Parse HTML
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Extract trophies
    trophies = extract_trophies_from_palmares(soup)
    
    print(f"\n📊 Summary:")
    print(f"  Total trophies found: {len(trophies)}")
    print(f"  Total titles: {sum(t['count'] for t in trophies)}")
    
    # Group by category
    by_category = {}
    for trophy in trophies:
        cat = trophy['category']
        by_category[cat] = by_category.get(cat, 0) + trophy['count']
    
    print(f"\n  By category:")
    for cat, count in by_category.items():
        print(f"    {cat}: {count}")
    
    return {
        'club_name': db_club_name,
        'wiki_name': wiki_club_name,
        'trophies': trophies
    }

if __name__ == "__main__":
    url = "https://fr.wikipedia.org/wiki/FC_Internazionale_Milano"
    result = scrape_wikipedia_trophies(url)
    
    if result:
        print(f"\n✅ Successfully scraped trophies for {result['club_name']}")
        print(f"\nTrophy details:")
        for trophy in result['trophies']:
            print(f"  • {trophy['competition_name']} ({trophy['category']}): {trophy['count']} titles")
