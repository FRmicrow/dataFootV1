#!/usr/bin/env python3
"""
Flashscore Career Scraper for Cristiano Ronaldo
Extracts all career statistics from League, Domestic Cup, International Cup, and National Team tabs
"""

import sys
import json
from playwright.sync_api import sync_playwright
import re
from datetime import datetime

def parse_season_year(season_str):
    """Extract the starting year from season string like '2009/2010' or '2009'"""
    match = re.search(r'(\d{4})', season_str)
    if match:
        return int(match.group(1))
    return None

def scrape_career_table(page, tab_name, competition_type):
    """
    Scrape a specific career table
    competition_type: 'championship', 'cup', 'international_cup', 'national_team'
    """
    print(f"  📊 Scraping {tab_name} tab...", file=sys.stderr)
    
    stats = []
    
    try:
        # Wait for table to load
        page.wait_for_timeout(2000)
        
        # Find all table rows
        # Flashscore typically uses specific class patterns
        rows = page.locator("tr").all()
        
        for row in rows:
            try:
                cells = row.locator("td").all()
                
                if len(cells) < 4:  # Need at least season, team, matches, goals
                    continue
                
                cell_texts = [cell.inner_text().strip() for cell in cells]
                
                # Typical structure: Season | Team | Competition | Matches | Goals | Assists
                # Adjust indices based on actual structure
                if len(cell_texts) >= 4:
                    season = cell_texts[0]
                    
                    # Check if this looks like a season
                    year = parse_season_year(season)
                    if not year or year >= 2010:
                        continue
                    
                    # Extract data (adjust indices as needed)
                    team = cell_texts[1] if len(cell_texts) > 1 else ""
                    competition = cell_texts[2] if len(cell_texts) > 2 else tab_name
                    
                    # Try to find numeric values for matches, goals, assists
                    matches = 0
                    goals = 0
                    assists = 0
                    
                    for i, text in enumerate(cell_texts[3:], start=3):
                        # Extract numbers
                        num_match = re.search(r'(\d+)', text)
                        if num_match:
                            num = int(num_match.group(1))
                            if i == 3:  # Matches
                                matches = num
                            elif i == 4:  # Goals
                                goals = num
                            elif i == 5:  # Assists
                                assists = num
                    
                    stat_entry = {
                        "season": season,
                        "team": team,
                        "competition": competition,
                        "competition_type": competition_type,
                        "matches": matches,
                        "goals": goals,
                        "assists": assists
                    }
                    
                    stats.append(stat_entry)
                    print(f"    ✓ {season} - {team}: {matches}M {goals}G {assists}A", file=sys.stderr)
            
            except Exception as e:
                continue
    
    except Exception as e:
        print(f"    ⚠️ Error scraping {tab_name}: {str(e)}", file=sys.stderr)
    
    return stats

def scrape_ronaldo_career():
    """
    Main scraper function - extracts all career data from Flashscore
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
            
            # Handle cookie consent / overlays
            print("🍪 Handling popups and overlays...", file=sys.stderr)
            try:
                # Try to close cookie consent
                cookie_buttons = [
                    "button:has-text('Accept')",
                    "button:has-text('Agree')",
                    "button:has-text('OK')",
                    "#onetrust-accept-btn-handler",
                    ".wcl-button:has-text('Accept')"
                ]
                
                for selector in cookie_buttons:
                    try:
                        button = page.locator(selector).first
                        if button.is_visible(timeout=2000):
                            button.click()
                            page.wait_for_timeout(1000)
                            print(f"  ✓ Closed popup", file=sys.stderr)
                            break
                    except:
                        continue
                
                # Try to close any overlay dialogs
                try:
                    overlay = page.locator("[data-testid='wcl-dialog-overlay']").first
                    if overlay.is_visible(timeout=1000):
                        # Press Escape to close
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(1000)
                except:
                    pass
                    
            except Exception as e:
                print(f"  ⚠️ Popup handling: {str(e)}", file=sys.stderr)
            
            all_stats = []
            
            # Tab configurations
            tabs = [
                {"name": "League", "selector": "text=/^League$/i", "type": "championship"},
                {"name": "Domestic Cup", "selector": "text=/Domestic.*Cup/i", "type": "cup"},
                {"name": "International Cup", "selector": "text=/International.*Cup/i", "type": "international_cup"},
                {"name": "National Team", "selector": "text=/National.*Team/i", "type": "national_team"}
            ]
            
            for tab in tabs:
                try:
                    print(f"\n🔍 Processing '{tab['name']}' tab...", file=sys.stderr)
                    
                    # Find the tab element
                    tab_element = page.locator(tab["selector"]).first
                    
                    if not tab_element.is_visible(timeout=5000):
                        print(f"  ⚠️ '{tab['name']}' tab not visible", file=sys.stderr)
                        continue
                    
                    # Check if tab is already selected
                    is_selected = tab_element.get_attribute("data-selected") == "true"
                    
                    if not is_selected:
                        print(f"  🖱️  Clicking '{tab['name']}' tab...", file=sys.stderr)
                        
                        # Use JavaScript to force click (bypass overlays)
                        page.evaluate("(element) => element.click()", tab_element.element_handle())
                        page.wait_for_timeout(2000)
                    else:
                        print(f"  ✓ '{tab['name']}' tab already selected", file=sys.stderr)
                    
                    # Scrape this tab's data
                    tab_stats = scrape_career_table(page, tab["name"], tab["type"])
                    all_stats.extend(tab_stats)
                
                except Exception as e:
                    print(f"  ⚠️ Could not process '{tab['name']}' tab: {str(e)}", file=sys.stderr)
            
            browser.close()
            
            if not all_stats:
                return {
                    "success": False,
                    "error": "No pre-2010 statistics found. Please check the page structure."
                }
            
            # Group by season and competition type
            print(f"\n✅ Scraped {len(all_stats)} season entries", file=sys.stderr)
            
            return {
                "success": True,
                "player_name": "Cristiano Ronaldo",
                "player_id": "WGOY4FSt",
                "seasons_count": len(all_stats),
                "data": all_stats
            }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Scraping failed: {str(e)}"
        }

if __name__ == "__main__":
    result = scrape_ronaldo_career()
    print(json.dumps(result, indent=2))
