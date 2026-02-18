import requests
from bs4 import BeautifulSoup
import re
import sqlite3
import os
import time

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database.sqlite')

# Competition name mapping (same as before)
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
    "Trophée des champions": {"name": "Trophée des Champions", "type": "national_cup"},
    
    # International Cups
    "Ligue des champions": {"name": "UEFA Champions League", "type": "international_cup"},
    "Coupe des clubs champions européens": {"name": "UEFA Champions League", "type": "international_cup"},
    "Ligue Europa": {"name": "UEFA Europa League", "type": "international_cup"},
    "Coupe UEFA": {"name": "UEFA Cup", "type": "international_cup"},
    "Supercoupe d'Europe": {"name": "UEFA Super Cup", "type": "international_cup"},
    "Coupe intercontinentale": {"name": "Intercontinental Cup", "type": "international_cup"},
    "Coupe du monde des clubs de la FIFA": {"name": "FIFA Club World Cup", "type": "international_cup"},
    "Supercoupe intercontinentale": {"name": "Intercontinental Super Cup", "type": "international_cup"},
    "Coupe Intertoto": {"name": "UEFA Intertoto Cup", "type": "international_cup"},
    "Coupe des vainqueurs de coupe": {"name": "UEFA Cup Winners' Cup", "type": "international_cup"},
}

# All clubs to scrape
CLUBS_TO_SCRAPE = [
    # 🇫🇷 LIGUE 1
    ("Angers", "https://fr.wikipedia.org/wiki/Angers_SCO"),
    ("Auxerre", "https://fr.wikipedia.org/wiki/AJ_Auxerre"),
    ("Stade Brestois 29", "https://fr.wikipedia.org/wiki/Stade_Brestois_29"),
    ("Le Havre", "https://fr.wikipedia.org/wiki/Le_Havre_Athletic_Club_(football)"),
    ("Lens", "https://fr.wikipedia.org/wiki/Racing_Club_de_Lens"),
    ("Lille", "https://fr.wikipedia.org/wiki/LOSC_Lille"),
    ("Lorient", "https://fr.wikipedia.org/wiki/FC_Lorient"),
    ("Lyon", "https://fr.wikipedia.org/wiki/Olympique_Lyonnais"),
    ("Marseille", "https://fr.wikipedia.org/wiki/Olympique_de_Marseille"),
    ("Metz", "https://fr.wikipedia.org/wiki/FC_Metz"),
    ("Monaco", "https://fr.wikipedia.org/wiki/AS_Monaco"),
    ("Nantes", "https://fr.wikipedia.org/wiki/FC_Nantes"),
    ("Nice", "https://fr.wikipedia.org/wiki/OGC_Nice"),
    ("Paris FC", "https://fr.wikipedia.org/wiki/Paris_FC"),
    ("Paris Saint Germain", "https://fr.wikipedia.org/wiki/Paris_Saint-Germain"),
    ("Rennes", "https://fr.wikipedia.org/wiki/Stade_rennais_Football_Club"),
    ("Strasbourg", "https://fr.wikipedia.org/wiki/Racing_Club_de_Strasbourg_Alsace"),
    ("Toulouse", "https://fr.wikipedia.org/wiki/Toulouse_FC"),
    
    # 🏴 PREMIER LEAGUE
    ("Arsenal", "https://fr.wikipedia.org/wiki/Arsenal_FC"),
    ("Aston Villa", "https://fr.wikipedia.org/wiki/Aston_Villa_FC"),
    ("Bournemouth", "https://fr.wikipedia.org/wiki/AFC_Bournemouth"),
    ("Brentford", "https://fr.wikipedia.org/wiki/Brentford_FC"),
    ("Brighton", "https://fr.wikipedia.org/wiki/Brighton_%26_Hove_Albion_FC"),
    ("Burnley", "https://fr.wikipedia.org/wiki/Burnley_FC"),
    ("Chelsea", "https://fr.wikipedia.org/wiki/Chelsea_FC"),
    ("Crystal Palace", "https://fr.wikipedia.org/wiki/Crystal_Palace_FC"),
    ("Everton", "https://fr.wikipedia.org/wiki/Everton_FC"),
    ("Fulham", "https://fr.wikipedia.org/wiki/Fulham_FC"),
    ("Leeds", "https://fr.wikipedia.org/wiki/Leeds_United"),
    ("Liverpool", "https://fr.wikipedia.org/wiki/Liverpool_FC"),
    ("Manchester City", "https://fr.wikipedia.org/wiki/Manchester_City_FC"),
    ("Manchester United", "https://fr.wikipedia.org/wiki/Manchester_United"),
    ("Newcastle", "https://fr.wikipedia.org/wiki/Newcastle_United"),
    ("Nottingham Forest", "https://fr.wikipedia.org/wiki/Nottingham_Forest_FC"),
    ("Sunderland", "https://fr.wikipedia.org/wiki/Sunderland_AFC"),
    ("Tottenham", "https://fr.wikipedia.org/wiki/Tottenham_Hotspur"),
    ("West Ham", "https://fr.wikipedia.org/wiki/West_Ham_United"),
    ("Wolves", "https://fr.wikipedia.org/wiki/Wolverhampton_Wanderers"),
    
    # 🇪🇸 LA LIGA
    ("Real Madrid", "https://fr.wikipedia.org/wiki/Real_Madrid_Club_de_F%C3%BAtbol"),
    ("Barcelona", "https://fr.wikipedia.org/wiki/FC_Barcelone_(football)"),
    ("Alaves", "https://fr.wikipedia.org/wiki/Deportivo_Alavés"),
    ("Athletic Club", "https://fr.wikipedia.org/wiki/Athletic_Bilbao"),
    ("Atletico Madrid", "https://fr.wikipedia.org/wiki/Atl%C3%A9tico_de_Madrid"),
    ("Celta Vigo", "https://fr.wikipedia.org/wiki/Celta_Vigo"),
    ("Elche", "https://fr.wikipedia.org/wiki/Elche_CF"),
    ("Espanyol", "https://fr.wikipedia.org/wiki/RCD_Espanyol_de_Barcelone"),
    ("Getafe", "https://fr.wikipedia.org/wiki/Getafe_CF"),
    ("Girona", "https://fr.wikipedia.org/wiki/Girona_FC"),
    ("Levante", "https://fr.wikipedia.org/wiki/Levante_UD"),
    ("Mallorca", "https://fr.wikipedia.org/wiki/RCD_Mallorca"),
    ("Osasuna", "https://fr.wikipedia.org/wiki/CA_Osasuna"),
    ("Oviedo", "https://fr.wikipedia.org/wiki/Real_Oviedo"),
    ("Real Betis", "https://fr.wikipedia.org/wiki/Real_Betis"),
    ("Real Sociedad", "https://fr.wikipedia.org/wiki/Real_Sociedad"),
    ("Sevilla", "https://fr.wikipedia.org/wiki/Sevilla_FC"),
    ("Valencia", "https://fr.wikipedia.org/wiki/Valencia_CF"),
    ("Villarreal", "https://fr.wikipedia.org/wiki/Villarreal_CF"),
    ("Rayo Vallecano", "https://fr.wikipedia.org/wiki/Rayo_Vallecano"),
    
    # 🇮🇹 SERIE A
    ("Pisa", "https://fr.wikipedia.org/wiki/Pisa_Sporting_Club"),
    ("Torino", "https://fr.wikipedia.org/wiki/Torino_Football_Club"),
    ("Atalanta", "https://fr.wikipedia.org/wiki/Atalanta_Bergamasca_Calcio"),
    ("Bologna", "https://fr.wikipedia.org/wiki/Bologna_FC_1909"),
    ("Cagliari", "https://fr.wikipedia.org/wiki/Cagliari_Calcio"),
    ("Cremonese", "https://fr.wikipedia.org/wiki/US_Cremonese"),
    ("Fiorentina", "https://fr.wikipedia.org/wiki/ACF_Fiorentina"),
    ("Genoa", "https://fr.wikipedia.org/wiki/Genoa_CFC"),
    ("Inter", "https://fr.wikipedia.org/wiki/FC_Internazionale_Milano"),
    ("Juventus", "https://fr.wikipedia.org/wiki/Juventus"),
    ("Lazio", "https://fr.wikipedia.org/wiki/SS_Lazio"),
    ("Lecce", "https://fr.wikipedia.org/wiki/US_Lecce"),
    ("AC Milan", "https://fr.wikipedia.org/wiki/AC_Milan"),
    ("Napoli", "https://fr.wikipedia.org/wiki/SSC_Napoli"),
    ("Parma", "https://fr.wikipedia.org/wiki/Parma_Calcio_1913"),
    ("AS Roma", "https://fr.wikipedia.org/wiki/AS_Roma"),
    ("Udinese", "https://fr.wikipedia.org/wiki/Udinese_Calcio"),
    ("Verona", "https://fr.wikipedia.org/wiki/Hellas_Verona_FC"),
    ("Sassuolo", "https://fr.wikipedia.org/wiki/US_Sassuolo_Calcio"),
    ("Como", "https://fr.wikipedia.org/wiki/Como_1907"),
    
    # 🇩🇪 BUNDESLIGA
    ("FC Augsburg", "https://fr.wikipedia.org/wiki/FC_Augsbourg"),
    ("Union Berlin", "https://fr.wikipedia.org/wiki/1._FC_Union_Berlin"),
    ("Werder Bremen", "https://fr.wikipedia.org/wiki/SV_Werder_Bremen"),
    ("Borussia Dortmund", "https://fr.wikipedia.org/wiki/Borussia_Dortmund"),
    ("Eintracht Frankfurt", "https://fr.wikipedia.org/wiki/Eintracht_Frankfurt"),
    ("SC Freiburg", "https://fr.wikipedia.org/wiki/SC_Freiburg"),
    ("Hamburger SV", "https://fr.wikipedia.org/wiki/Hamburger_SV"),
    ("1. FC Heidenheim", "https://fr.wikipedia.org/wiki/1._FC_Heidenheim"),
    ("1899 Hoffenheim", "https://fr.wikipedia.org/wiki/TSG_1899_Hoffenheim"),
    ("FSV Mainz 05", "https://fr.wikipedia.org/wiki/1._FSV_Mainz_05"),
    ("Bayer Leverkusen", "https://fr.wikipedia.org/wiki/Bayer_04_Leverkusen"),
    ("Bayern München", "https://fr.wikipedia.org/wiki/FC_Bayern_Munich"),
    ("Borussia Mönchengladbach", "https://fr.wikipedia.org/wiki/Borussia_M%C3%B6nchengladbach"),
    ("VfB Stuttgart", "https://fr.wikipedia.org/wiki/VfB_Stuttgart"),
    ("VfL Wolfsburg", "https://fr.wikipedia.org/wiki/VfL_Wolfsburg"),
    ("SV Darmstadt 98", "https://fr.wikipedia.org/wiki/SV_Darmstadt_98"),
    ("FC Schalke 04", "https://fr.wikipedia.org/wiki/FC_Schalke_04"),
    ("RB Leipzig", "https://fr.wikipedia.org/wiki/RB_Leipzig"),
]

def get_or_create_season(cursor, year):
    """Get or create a season for a given year"""
    cursor.execute('SELECT id FROM seasons WHERE year = ?', (year,))
    season = cursor.fetchone()
    
    if not season:
        label = f"{year-1}-{year}"
        cursor.execute('INSERT INTO seasons (year, label) VALUES (?, ?)', (year, label))
        return cursor.lastrowid
    return season['id']

def scrape_and_store_trophies(club_name, wikipedia_url, conn):
    """Scrape Wikipedia and store trophies in database"""
    
    cursor = conn.cursor()
    
    # Find club in database - try exact match first, then fuzzy
    cursor.execute('SELECT id, name FROM clubs WHERE name = ?', (club_name,))
    club = cursor.fetchone()
    
    if not club:
        # Try fuzzy match but exclude Miami
        cursor.execute('SELECT id, name FROM clubs WHERE name LIKE ? AND name NOT LIKE "%Miami%"', (f'%{club_name}%',))
        club = cursor.fetchone()
    
    if not club:
        print(f"  ⚠️  Club '{club_name}' not found in database - SKIPPING")
        return False
    
    club_id = club['id']
    club_name_db = club['name']
    
    # Fetch Wikipedia page
    try:
        response = requests.get(wikipedia_url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"  ❌ Error fetching page: {e}")
        return False
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Stats
    trophies_added = 0
    
    # Find all list items that contain trophy information
    for li in soup.find_all('li'):
        text = li.get_text()
        
        # EXCLUDE 2nd and 3rd place finishes
        # Skip if it mentions: Vice-champion, Finaliste, 2e, 3e, Demi-finaliste, etc.
        exclusion_keywords = ['Vice-champion', 'Finaliste', '2e', '3e', 'Demi-finaliste', 
                             'vice-champion', 'finaliste', 'demi-finaliste']
        if any(keyword in text for keyword in exclusion_keywords):
            continue
        
        # Look for trophy patterns
        for comp_fr, mapping in COMPETITION_MAPPING.items():
            if comp_fr in text:
                # ONLY capture if it explicitly says Champion or Vainqueur (Winner)
                if ('Champion' in text and 'Vice-champion' not in text) or \
                   ('Vainqueur' in text) or \
                   ('Victoire' in text):
                    # Extract years from links
                    years = []
                    for link in li.find_all('a'):
                        year_text = link.get_text().strip()
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
                        else:
                            trophy_id = trophy['id']
                        
                        # Add team trophies for each year
                        for year in years:
                            season_id = get_or_create_season(cursor, year)
                            
                            # Check if already exists
                            cursor.execute(
                                'SELECT id FROM team_trophies WHERE team_id = ? AND trophy_id = ? AND season_id = ?',
                                (club_id, trophy_id, season_id)
                            )
                            if not cursor.fetchone():
                                cursor.execute(
                                    'INSERT INTO team_trophies (team_id, trophy_id, season_id, place) VALUES (?, ?, ?, ?)',
                                    (club_id, trophy_id, season_id, 'Winner')
                                )
                                trophies_added += 1
    
    if trophies_added > 0:
        print(f"  ✅ {club_name_db}: {trophies_added} trophies")
    else:
        print(f"  ⚠️  {club_name_db}: No trophies found")
    
    return trophies_added > 0

def main():
    print("\n" + "="*80)
    print("🏆 BATCH WIKIPEDIA TROPHY SCRAPER - TOP 5 EUROPEAN LEAGUES")
    print("="*80)
    print(f"Total clubs to process: {len(CLUBS_TO_SCRAPE)}")
    print("="*80 + "\n")
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    total_clubs = len(CLUBS_TO_SCRAPE)
    success_count = 0
    failed_count = 0
    skipped_count = 0
    
    for idx, (club_name, url) in enumerate(CLUBS_TO_SCRAPE, 1):
        print(f"[{idx}/{total_clubs}] {club_name}...")
        
        try:
            result = scrape_and_store_trophies(club_name, url, conn)
            if result:
                success_count += 1
            elif result is None:
                skipped_count += 1
            else:
                failed_count += 1
            
            # Commit after each club
            conn.commit()
            
            # Small delay to be respectful to Wikipedia
            time.sleep(1)
            
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            failed_count += 1
            continue
    
    conn.close()
    
    print("\n" + "="*80)
    print("📊 FINAL SUMMARY")
    print("="*80)
    print(f"  Total clubs processed: {total_clubs}")
    print(f"  ✅ Success: {success_count}")
    print(f"  ⚠️  Skipped: {skipped_count}")
    print(f"  ❌ Failed: {failed_count}")
    print("="*80)
    print("\n✅ Batch import complete!\n")

if __name__ == "__main__":
    main()
