#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
from bs4 import BeautifulSoup
import sqlite3
import os
import re
import time

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database.sqlite')

# Trophy IDs (as inserted in DB)
TROPHY_IDS = {
    'Ligue 1': 247,
    'La Liga': 248,
    'Bundesliga': 249,
    'Premier League': 250,
    'Serie A': 251
}

# Club name mappings to match Wikipedia names to database team names
CLUB_MAPPINGS = {
    # French clubs
    'PSG': 'Paris Saint Germain',
    'Paris Saint-Germain': 'Paris Saint Germain',
    'Paris Saint-GermainT': 'Paris Saint Germain',  # Wikipedia sometimes has trailing chars
    'Paris SG': 'Paris Saint Germain',
    'AS Saint-Étienne': 'Saint-Etienne',
    'Saint-Étienne': 'Saint-Etienne',
    'ASSE': 'Saint-Etienne',
    'Olympique de Marseille': 'Marseille',
    'OM': 'Marseille',
    'AS Monaco': 'Monaco',
    'FC Nantes': 'Nantes',
    'Girondins de Bordeaux': 'Bordeaux',
    'OGC Nice': 'Nice',
    'Olympique lyonnais': 'Lyon',
    'OL': 'Lyon',
    'Stade de Reims': 'Reims',
    'RC Lens': 'Lens',
    'AJ Auxerre': 'Auxerre',
    'Lille OSC': 'Lille',
    'LOSC': 'Lille',
    'Olympique lillois': 'Lille',  # Historical name
    'Montpellier HSC': 'Montpellier',
    'RC Strasbourg': 'Strasbourg',
    'FC Sochaux-Montbéliard': 'Sochaux',
    'FC Sochaux': 'Sochaux',
    
    # Spanish clubs
    'Real Madrid': 'Real Madrid',
    'FC Barcelone': 'Barcelona',
    'Barcelona': 'Barcelona',
    'Barça': 'Barcelona',
    'Atlético de Madrid': 'Atletico Madrid',
    'Atlético Madrid': 'Atletico Madrid',
    'Athletic Bilbao': 'Athletic Club',
    'Athletic Club': 'Athletic Club',
    'Valence': 'Valencia',
    'Valencia CF': 'Valencia',
    'Real Sociedad': 'Real Sociedad',
    'Séville': 'Sevilla',
    'Sevilla FC': 'Sevilla',
    'Betis Séville': 'Real Betis',
    'Real Betis': 'Real Betis',
    'Villarreal': 'Villarreal',
    
    # German clubs
    'Bayern Munich': 'Bayern Munich',
    'FC Bayern Munich': 'Bayern Munich',
    'Bayern München': 'Bayern Munich',
    'Borussia Dortmund': 'Borussia Dortmund',
    'BVB': 'Borussia Dortmund',
    'RB Leipzig': 'RB Leipzig',
    'Bayer Leverkusen': 'Bayer Leverkusen',
    'Bayer 04 Leverkusen': 'Bayer Leverkusen',
    'Borussia M\'gladbach': 'Borussia Monchengladbach',
    'Borussia Mönchengladbach': 'Borussia Monchengladbach',
    'VfB Stuttgart': 'VfB Stuttgart',
    'Werder Brême': 'Werder Bremen',
    'Werder Bremen': 'Werder Bremen',
    'Hambourg': 'Hamburg',
    'Hamburger SV': 'Hamburg',
    'FC Cologne': 'FC Koln',
    '1. FC Cologne': 'FC Koln',
    '1. FC Köln': 'FC Koln',
    'Eintracht Francfort': 'Eintracht Frankfurt',
    'Eintracht Frankfurt': 'Eintracht Frankfurt',
    'VfL Wolfsburg': 'Wolfsburg',
    'FC Schalke 04': 'Schalke 04',
    'Schalke 04': 'Schalke 04',
    'MSV Duisbourg': 'MSV Duisburg',
    'MSV Duisburg': 'MSV Duisburg',
    'Kaiserslautern': '1. FC Kaiserslautern',
    '1. FC Kaiserslautern': '1. FC Kaiserslautern',
    'FC Nuremberg': '1. FC Nurnberg',
    '1. FC Nuremberg': '1. FC Nurnberg',
    '1. FC Nürnberg': '1. FC Nurnberg',
    
    # English clubs
    'Manchester United': 'Manchester United',
    'Man United': 'Manchester United',
    'Manchester City': 'Manchester City',
    'Man City': 'Manchester City',
    'Liverpool': 'Liverpool',
    'Liverpool FC': 'Liverpool',
    'Arsenal': 'Arsenal',
    'Arsenal FC': 'Arsenal',
    'Chelsea': 'Chelsea',
    'Chelsea FC': 'Chelsea',
    'Tottenham': 'Tottenham',
    'Tottenham Hotspur': 'Tottenham',
    'Spurs': 'Tottenham',
    'Newcastle': 'Newcastle',
    'Newcastle United': 'Newcastle',
    'Aston Villa': 'Aston Villa',
    'Everton': 'Everton',
    'Leeds United': 'Leeds',
    'Leeds': 'Leeds',
    'Nottingham Forest': 'Nottingham Forest',
    'West Ham': 'West Ham',
    'West Ham United': 'West Ham',
    'Leicester': 'Leicester',
    'Leicester City': 'Leicester',
    'Blackburn': 'Blackburn',
    'Blackburn Rovers': 'Blackburn',
    'Wolves': 'Wolverhampton Wanderers',
    'Wolverhampton': 'Wolverhampton Wanderers',
    'Sunderland': 'Sunderland',
    'Sheffield': 'Sheffield United',
    'Sheffield United': 'Sheffield United',
    'Derby County': 'Derby',
    'Preston North End': 'Preston',
    'Huddersfield Town': 'Huddersfield',
    'Ipswich Town': 'Ipswich',
    
    # Italian clubs
    'Juventus': 'Juventus',
    'Juventus FC': 'Juventus',
    'Inter': 'Inter',
    'Inter Milan': 'Inter',
    'Internazionale': 'Inter',
    'FC Internazionale Milano': 'Inter',
    'Milan': 'AC Milan',
    'AC Milan': 'AC Milan',
    'Milan AC': 'AC Milan',
    'Napoli': 'Napoli',
    'SSC Napoli': 'Napoli',
    'SSC Naples': 'Napoli',
    'Naples': 'Napoli',
    'AS Roma': 'Roma',
    'AS Rome': 'Roma',
    'Roma': 'Roma',
    'Rome': 'Roma',
    'Lazio': 'Lazio',
    'SS Lazio': 'Lazio',
    'Lazio Rome': 'Lazio',
    'Atalanta': 'Atalanta',
    'Atalanta Bergame': 'Atalanta',
    'Fiorentina': 'Fiorentina',
    'ACF Fiorentina': 'Fiorentina',
    'Torino': 'Torino',
    'Torino FC': 'Torino',
    'Genoa': 'Genoa',
    'Genoa CFC': 'Genoa',
    'Bologne': 'Bologna',
    'Bologna': 'Bologna',
    'Bologna FC': 'Bologna',
    'Bologne FC': 'Bologna',
    'Sampdoria': 'Sampdoria',
    'UC Sampdoria': 'Sampdoria',
    'Cagliari': 'Cagliari',
    'Hellas Vérone': 'Verona',
    'Hellas Verona': 'Verona',
    'Parme': 'Parma',
    'Parma': 'Parma',
    'Parme FC': 'Parma',
    'Parma FC': 'Parma',
}

def normalize_club_name(name):
    """Normalize club name for matching"""
    if not name:
        return None
    # Remove extra whitespace and common prefixes
    name = ' '.join(name.strip().split())
    # Check mapping
    if name in CLUB_MAPPINGS:
        return CLUB_MAPPINGS[name]
    return name

def find_team_id(club_name, db):
    """Find team ID in database by club name"""
    normalized = normalize_club_name(club_name)
    if not normalized:
        return None
    
    # Try exact match first
    result = db.execute("SELECT id FROM teams WHERE name = ?", (normalized,)).fetchone()
    if result:
        return result[0]
    
    # Try case-insensitive match
    result = db.execute("SELECT id FROM teams WHERE LOWER(name) = LOWER(?)", (normalized,)).fetchone()
    if result:
        return result[0]
    
    # Try partial match
    result = db.execute("SELECT id FROM teams WHERE LOWER(name) LIKE LOWER(?)", (f'%{normalized}%',)).fetchone()
    if result:
        return result[0]
    
    return None

def scrape_ligue1():
    """Scrape Ligue 1 trophy data from Wikipedia"""
    print("\n=== Scraping Ligue 1 ===")
    url = "https://fr.wikipedia.org/wiki/Championnat_de_France_de_football"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        trophies = []
        
        # Find all tables and look for one with clubs and years
        tables = soup.find_all('table', class_='wikitable')
        for table in tables:
            # Check if this table has the right structure
            rows = table.find_all('tr')[1:]  # Skip header
            
            for row in rows:
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 3:
                    # Check if first column is a number (ranking), if so, skip it
                    first_col = cols[0].get_text(strip=True)
                    col_offset = 0
                    
                    # If first column is just a number, it's a ranking column
                    if first_col.isdigit() or re.match(r'^\d+$', first_col):
                        col_offset = 1
                    
                    if len(cols) < 3 + col_offset:
                        continue
                    
                    club_name = cols[0 + col_offset].get_text(strip=True)
                    titles_text = cols[1 + col_offset].get_text(strip=True)
                    years_text = cols[2 + col_offset].get_text(strip=True)
                    
                    # Skip header rows and non-club rows
                    if 'Club' in club_name or 'Titre' in titles_text or not club_name:
                        continue
                    
                    # Extract years
                    years = re.findall(r'\b(19\d{2}|20\d{2})\b', years_text)
                    
                    if club_name and years and len(years) > 0:
                        for year in years:
                            trophies.append({
                                'club': club_name,
                                'year': int(year),
                                'place': 1
                            })
                        print(f"  ✓ {club_name}: {len(years)} titles")
            
            # If we found trophies in this table, we're done
            if len(trophies) > 0:
                break
        
        print(f"  Total: {len(trophies)} Ligue 1 trophies found")
        return trophies
    
    except Exception as e:
        print(f"  ✗ Error scraping Ligue 1: {e}")
        return []

def scrape_laliga():
    """Scrape La Liga trophy data from Wikipedia"""
    print("\n=== Scraping La Liga ===")
    url = "https://fr.wikipedia.org/wiki/Championnat_d%27Espagne_de_football"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        trophies = []
        
        # Find the Palmarès section with historical results
        tables = soup.find_all('table', class_='wikitable')
        for table in tables:
            rows = table.find_all('tr')[1:]  # Skip header
            
            for row in rows:
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 3:
                    season_text = cols[0].get_text(strip=True)
                    champion = cols[1].get_text(strip=True) if len(cols) > 1 else None
                    runner_up = cols[2].get_text(strip=True) if len(cols) > 2 else None
                    third = cols[3].get_text(strip=True) if len(cols) > 3 else None
                    
                    # Extract year from season (e.g., "2024-2025" -> 2025)
                    year_match = re.search(r'(\d{4})-(\d{4})', season_text)
                    if year_match:
                        year = int(year_match.group(2))
                    else:
                        year_match = re.search(r'\b(19\d{2}|20\d{2})\b', season_text)
                        if year_match:
                            year = int(year_match.group(1))
                        else:
                            continue
                    
                    if champion and year >= 1900:
                        trophies.append({'club': champion, 'year': year, 'place': 1})
                    if runner_up and year >= 1900:
                        trophies.append({'club': runner_up, 'year': year, 'place': 2})
                    if third and year >= 1900:
                        trophies.append({'club': third, 'year': year, 'place': 3})
        
        print(f"  Total: {len(trophies)} La Liga placements found")
        return trophies
    
    except Exception as e:
        print(f"  ✗ Error scraping La Liga: {e}")
        return []

def scrape_bundesliga():
    """Scrape Bundesliga trophy data from Wikipedia"""
    print("\n=== Scraping Bundesliga ===")
    url = "https://fr.wikipedia.org/wiki/Championnat_d%27Allemagne_de_football"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        trophies = []
        
        tables = soup.find_all('table', class_='wikitable')
        for table in tables:
            rows = table.find_all('tr')[1:]  # Skip header
            
            for row in rows:
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 2:
                    season_text = cols[0].get_text(strip=True)
                    champion = cols[1].get_text(strip=True) if len(cols) > 1 else None
                    runner_up = cols[2].get_text(strip=True) if len(cols) > 2 else None
                    
                    # Extract year
                    year_match = re.search(r'(\d{4})-(\d{4})', season_text)
                    if year_match:
                        year = int(year_match.group(2))
                    else:
                        year_match = re.search(r'\b(19\d{2}|20\d{2})\b', season_text)
                        if year_match:
                            year = int(year_match.group(1))
                        else:
                            continue
                    
                    if champion and year >= 1900:
                        trophies.append({'club': champion, 'year': year, 'place': 1})
                    if runner_up and year >= 1900:
                        trophies.append({'club': runner_up, 'year': year, 'place': 2})
        
        print(f"  Total: {len(trophies)} Bundesliga placements found")
        return trophies
    
    except Exception as e:
        print(f"  ✗ Error scraping Bundesliga: {e}")
        return []

def scrape_premier_league():
    """Scrape Premier League trophy data from Wikipedia"""
    print("\n=== Scraping Premier League ===")
    url = "https://fr.wikipedia.org/wiki/Championnat_d%27Angleterre_de_football"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        trophies = []
        
        # Find all tables and look for one with clubs and years
        tables = soup.find_all('table', class_='wikitable')
        for table in tables:
            rows = table.find_all('tr')[1:]  # Skip header
            
            for row in rows:
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 3:
                    # Check if first column is a number (ranking), if so, skip it
                    first_col = cols[0].get_text(strip=True)
                    col_offset = 0
                    
                    # If first column is just a number, it's a ranking column
                    if first_col.isdigit() or re.match(r'^\d+$', first_col):
                        col_offset = 1
                    
                    if len(cols) < 3 + col_offset:
                        continue
                    
                    club_name = cols[0 + col_offset].get_text(strip=True)
                    titles_text = cols[1 + col_offset].get_text(strip=True)
                    years_text = cols[2 + col_offset].get_text(strip=True)
                    
                    # Skip header rows and non-club rows
                    if 'Club' in club_name or 'Titre' in titles_text or not club_name:
                        continue
                    
                    # Extract years
                    years = re.findall(r'\b(18\d{2}|19\d{2}|20\d{2})\b', years_text)
                    
                    if club_name and years and len(years) > 0:
                        for year in years:
                            trophies.append({
                                'club': club_name,
                                'year': int(year),
                                'place': 1
                            })
                        print(f"  ✓ {club_name}: {len(years)} titles")
            
            # If we found trophies in this table, we're done
            if len(trophies) > 0:
                break
        
        print(f"  Total: {len(trophies)} Premier League trophies found")
        return trophies
    
    except Exception as e:
        print(f"  ✗ Error scraping Premier League: {e}")
        return []

def scrape_serie_a():
    """Scrape Serie A trophy data from Wikipedia"""
    print("\n=== Scraping Serie A ===")
    url = "https://fr.wikipedia.org/wiki/Championnat_d%27Italie_de_football"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        trophies = []
        
        tables = soup.find_all('table', class_='wikitable')
        for table in tables:
            rows = table.find_all('tr')[1:]  # Skip header
            
            for row in rows:
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 2:
                    season_text = cols[0].get_text(strip=True)
                    champion = cols[1].get_text(strip=True) if len(cols) > 1 else None
                    runner_up = cols[2].get_text(strip=True) if len(cols) > 2 else None
                    
                    # Extract year
                    year_match = re.search(r'(\d{4})-(\d{4})', season_text)
                    if year_match:
                        year = int(year_match.group(2))
                    else:
                        year_match = re.search(r'\b(18\d{2}|19\d{2}|20\d{2})\b', season_text)
                        if year_match:
                            year = int(year_match.group(1))
                        else:
                            continue
                    
                    if champion and year >= 1898:
                        trophies.append({'club': champion, 'year': year, 'place': 1})
                    if runner_up and year >= 1898:
                        trophies.append({'club': runner_up, 'year': year, 'place': 2})
        
        print(f"  Total: {len(trophies)} Serie A placements found")
        return trophies
    
    except Exception as e:
        print(f"  ✗ Error scraping Serie A: {e}")
        return []

def import_trophies_to_db(trophies_data):
    """Import scraped trophies into the database"""
    print("\n=== Importing to Database ===")
    
    conn = sqlite3.connect(DB_PATH)
    db = conn.cursor()
    
    imported = 0
    skipped = 0
    errors = 0
    
    for league_name, trophies in trophies_data.items():
        trophy_id = TROPHY_IDS.get(league_name)
        if not trophy_id:
            print(f"  ✗ Trophy ID not found for {league_name}")
            continue
        
        print(f"\n  Importing {league_name} (Trophy ID: {trophy_id})...")
        
        for trophy in trophies:
            club_name = trophy['club']
            year = trophy['year']
            place = trophy['place']
            
            # Find team ID
            team_id = find_team_id(club_name, db)
            
            if not team_id:
                print(f"    ⚠ Team not found in DB: {club_name}")
                skipped += 1
                continue
            
            try:
                # Check if already exists
                existing = db.execute(
                    "SELECT id FROM team_trophies WHERE team_id = ? AND trophy_id = ? AND season_id = ? AND place = ?",
                    (team_id, trophy_id, year, place)
                ).fetchone()
                
                if existing:
                    skipped += 1
                    continue
                
                # Insert
                db.execute(
                    "INSERT INTO team_trophies (team_id, trophy_id, season_id, place) VALUES (?, ?, ?, ?)",
                    (team_id, trophy_id, year, place)
                )
                imported += 1
                
            except Exception as e:
                print(f"    ✗ Error importing {club_name} ({year}): {e}")
                errors += 1
    
    conn.commit()
    conn.close()
    
    print(f"\n=== Import Summary ===")
    print(f"  ✓ Imported: {imported}")
    print(f"  ⊘ Skipped: {skipped}")
    print(f"  ✗ Errors: {errors}")

def main():
    print("=" * 60)
    print("Championship Trophy Scraper")
    print("=" * 60)
    
    all_trophies = {}
    
    # Scrape all leagues
    all_trophies['Ligue 1'] = scrape_ligue1()
    time.sleep(1)  # Be polite to Wikipedia
    
    all_trophies['La Liga'] = scrape_laliga()
    time.sleep(1)
    
    all_trophies['Bundesliga'] = scrape_bundesliga()
    time.sleep(1)
    
    all_trophies['Premier League'] = scrape_premier_league()
    time.sleep(1)
    
    all_trophies['Serie A'] = scrape_serie_a()
    
    # Import to database
    import_trophies_to_db(all_trophies)
    
    print("\n" + "=" * 60)
    print("Done!")
    print("=" * 60)

if __name__ == "__main__":
    main()
