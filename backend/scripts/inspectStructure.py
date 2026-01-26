#!/usr/bin/env python3
"""
Flashscore Structure Inspector
Find out what HTML structure Flashscore actually uses
"""

import sys
from playwright.sync_api import sync_playwright

def inspect_structure():
    player_url = "https://www.flashscore.com/player/ronaldo-cristiano/WGOY4FSt/"
    
    with sync_playwright() as p:
        print("🌐 Launching browser...")
        browser = p.chromium.launch(headless=False)  # Visible
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
        
        print("\n" + "="*60)
        print("BROWSER OPENED")
        print("="*60)
        print("Please:")
        print("1. Open DevTools (F12)")
        print("2. Inspect a season row in the Career table")
        print("3. Note the HTML structure (div? class names?)")
        print("4. Look for patterns in class names")
        print("\nPress ENTER when done...")
        print("="*60 + "\n")
        
        input()
        
        # Try to capture page HTML
        print("\n📸 Saving page HTML...")
        html = page.content()
        
        with open("/tmp/flashscore_page.html", "w") as f:
            f.write(html)
        
        print("✅ HTML saved to /tmp/flashscore_page.html")
        
        browser.close()

if __name__ == "__main__":
    inspect_structure()
