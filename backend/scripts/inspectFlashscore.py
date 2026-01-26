#!/usr/bin/env python3
"""
Flashscore Page Inspector
Captures the actual page structure to understand how to scrape it
"""

import sys
from playwright.sync_api import sync_playwright

def inspect_flashscore_page():
    """
    Open Flashscore page and capture its structure
    """
    
    player_url = "https://www.flashscore.com/player/ronaldo-cristiano/pWChe7Qr/"
    
    with sync_playwright() as p:
        print("🌐 Launching browser (visible mode)...")
        browser = p.chromium.launch(headless=False)  # Visible browser
        page = browser.new_page()
        
        page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        })
        
        print(f"📄 Navigating to {player_url}...")
        page.goto(player_url, wait_until="networkidle", timeout=30000)
        
        # Wait for user to inspect
        print("\n" + "="*60)
        print("BROWSER OPENED - Please inspect the page structure:")
        print("="*60)
        print("1. Look for 'Career' or 'Statistics' tab")
        print("2. Check the Network tab for XHR/Fetch requests")
        print("3. Look for player ID in URLs")
        print("4. Note the HTML structure of season stats")
        print("\nPress ENTER when done inspecting...")
        print("="*60 + "\n")
        
        input()
        
        # Try to capture some basic info
        print("\n📸 Capturing page info...")
        
        # Get page title
        title = page.title()
        print(f"Title: {title}")
        
        # Get all links with 'career' or 'statistics'
        links = page.locator("a").all()
        print(f"\nFound {len(links)} links")
        
        career_links = []
        for link in links[:50]:  # Check first 50
            try:
                text = link.inner_text().lower()
                href = link.get_attribute("href") or ""
                if "career" in text or "statistic" in text or "career" in href:
                    career_links.append(f"{text} -> {href}")
            except:
                pass
        
        if career_links:
            print("\nCareer/Statistics related links:")
            for cl in career_links:
                print(f"  - {cl}")
        
        browser.close()
        print("\n✅ Inspection complete!")

if __name__ == "__main__":
    inspect_flashscore_page()
