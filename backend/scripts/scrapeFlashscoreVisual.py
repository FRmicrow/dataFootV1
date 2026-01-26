#!/usr/bin/env python3
"""
Flashscore Visual Scraper
Takes screenshots and extracts all visible text from career tables
"""

import sys
import json
from playwright.sync_api import sync_playwright
import re

def extract_all_text_from_page(page):
    """Extract all visible text from the page"""
    # Get all text content
    all_text = page.inner_text("body")
    return all_text

def parse_career_data_from_text(text, competition_type):
    """
    Parse career statistics from extracted text
    Looking for patterns like:
    2009/2010 Manchester United Premier League 33 18 3
    """
    stats = []
    lines = text.split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Look for season pattern
        season_match = re.search(r'(20\d{2}[/-]\d{2,4}|20\d{2}|19\d{2}[/-]\d{2,4}|19\d{2})', line)
        
        if season_match:
            season = season_match.group(1)
            year = int(season[:4])
            
            # Only pre-2010
            if year >= 2010:
                continue
            
            # Try to extract numbers (matches, goals, assists)
            numbers = re.findall(r'\b(\d+)\b', line)
            
            # Extract team name (usually before numbers)
            parts = line.split()
            team = ""
            competition = ""
            
            # Try to find team and competition names
            for j, part in enumerate(parts):
                if re.match(r'^\d+$', part):  # Found first number
                    # Everything before this (after season) is likely team/competition
                    team_parts = parts[1:j]
                    if len(team_parts) > 0:
                        # Last part might be competition, rest is team
                        if len(team_parts) > 1:
                            team = ' '.join(team_parts[:-1])
                            competition = team_parts[-1]
                        else:
                            team = team_parts[0]
                    break
            
            if len(numbers) >= 2:  # At least matches and goals
                matches = int(numbers[0]) if len(numbers) > 0 else 0
                goals = int(numbers[1]) if len(numbers) > 1 else 0
                assists = int(numbers[2]) if len(numbers) > 2 else 0
                
                stat = {
                    "season": season,
                    "team": team,
                    "competition": competition or competition_type,
                    "competition_type": competition_type,
                    "matches": matches,
                    "goals": goals,
                    "assists": assists,
                    "raw_line": line
                }
                
                stats.append(stat)
    
    return stats

def scrape_flashscore_visual():
    """
    Scrape Flashscore using visual/text extraction
    """
    player_url = "https://www.flashscore.com/player/ronaldo-cristiano/WGOY4FSt/"
    
    try:
        with sync_playwright() as p:
            print("🌐 Launching browser...", file=sys.stderr)
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            page.set_extra_http_headers({
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            })
            
            print(f"📄 Navigating to {player_url}...", file=sys.stderr)
            page.goto(player_url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)
            
            # Handle cookie consent
            try:
                button = page.locator("button:has-text('Accept')").first
                if button.is_visible(timeout=2000):
                    button.click()
                    page.wait_for_timeout(1000)
                    print("  ✓ Closed cookie popup", file=sys.stderr)
            except:
                pass
            
            all_stats = []
            
            # Tab configurations
            tabs = [
                {"name": "League", "selector": "button:has-text('League')", "type": "championship"},
                {"name": "Domestic Cup", "selector": "button:has-text('Domestic Cup')", "type": "cup"},
                {"name": "International Cup", "selector": "button:has-text('International Cup')", "type": "international_cup"},
                {"name": "National Team", "selector": "button:has-text('National Team')", "type": "national_team"}
            ]
            
            for tab in tabs:
                try:
                    print(f"\n🔍 Processing '{tab['name']}' tab...", file=sys.stderr)
                    
                    # Find and click tab
                    tab_element = page.locator(tab["selector"]).first
                    
                    if not tab_element.is_visible(timeout=5000):
                        print(f"  ⚠️ Tab not found", file=sys.stderr)
                        continue
                    
                    # Check if already selected
                    is_selected = tab_element.get_attribute("data-selected") == "true"
                    
                    if not is_selected:
                        print(f"  🖱️  Clicking tab...", file=sys.stderr)
                        page.evaluate("(element) => element.click()", tab_element.element_handle())
                        page.wait_for_timeout(2000)
                    else:
                        print(f"  ✓ Already selected", file=sys.stderr)
                    
                    # Extract all text from page
                    print(f"  📝 Extracting text...", file=sys.stderr)
                    page_text = extract_all_text_from_page(page)
                    
                    # Parse career data from text
                    tab_stats = parse_career_data_from_text(page_text, tab["type"])
                    
                    if tab_stats:
                        print(f"  ✓ Found {len(tab_stats)} pre-2010 entries", file=sys.stderr)
                        for stat in tab_stats:
                            print(f"    - {stat['season']} {stat['team']}: {stat['matches']}M {stat['goals']}G {stat['assists']}A", file=sys.stderr)
                    
                    all_stats.extend(tab_stats)
                
                except Exception as e:
                    print(f"  ⚠️ Error: {str(e)}", file=sys.stderr)
            
            browser.close()
            
            if not all_stats:
                return {
                    "success": False,
                    "error": "No pre-2010 statistics found"
                }
            
            # Remove duplicates
            unique_stats = []
            seen = set()
            for stat in all_stats:
                key = (stat['season'], stat['team'], stat['competition_type'])
                if key not in seen:
                    seen.add(key)
                    unique_stats.append(stat)
            
            print(f"\n✅ Total: {len(unique_stats)} unique pre-2010 entries", file=sys.stderr)
            
            return {
                "success": True,
                "player_name": "Cristiano Ronaldo",
                "player_id": "WGOY4FSt",
                "seasons_count": len(unique_stats),
                "data": unique_stats
            }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Scraping failed: {str(e)}"
        }

if __name__ == "__main__":
    result = scrape_flashscore_visual()
    print(json.dumps(result, indent=2))
