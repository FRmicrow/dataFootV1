#!/usr/bin/env python3
"""
Flashscore Debug Scraper
Shows what data is actually available in the tables
"""

import sys
from playwright.sync_api import sync_playwright

def debug_flashscore():
    player_url = "https://www.flashscore.com/player/ronaldo-cristiano/WGOY4FSt/"
    
    with sync_playwright() as p:
        print("🌐 Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        
        print(f"📄 Navigating to {player_url}...")
        page.goto(player_url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        
        # Handle cookie consent
        try:
            button = page.locator("button:has-text('Accept')").first
            if button.is_visible(timeout=2000):
                button.click()
                page.wait_for_timeout(1000)
        except:
            pass
        
        # Get all table rows
        print("\n📊 Analyzing table structure...")
        rows = page.locator("tr").all()
        
        print(f"Found {len(rows)} total rows\n")
        
        for i, row in enumerate(rows[:20]):  # First 20 rows
            try:
                cells = row.locator("td").all()
                if len(cells) > 0:
                    cell_texts = [cell.inner_text().strip() for cell in cells]
                    print(f"Row {i}: {len(cells)} cells")
                    for j, text in enumerate(cell_texts):
                        print(f"  Cell {j}: {text[:50]}")  # First 50 chars
                    print()
            except:
                pass
        
        browser.close()

if __name__ == "__main__":
    debug_flashscore()
