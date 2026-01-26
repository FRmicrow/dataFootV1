#!/usr/bin/env python3
"""
Flashscore DOM & Screenshot Capturer
Saves screenshots and raw HTML for manual analysis
"""

import sys
import json
from playwright.sync_api import sync_playwright
import os

def capture_flashscore_data():
    """
    Capture screenshots and DOM HTML from all career tabs
    """
    player_url = "https://www.flashscore.com/player/ronaldo-cristiano/WGOY4FSt/"
    output_dir = "/tmp/flashscore_capture"
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        with sync_playwright() as p:
            print("🌐 Launching browser...")
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1920, "height": 1080})
            
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
                    print("  ✓ Closed cookie popup")
            except:
                pass
            
            # Tab configurations
            tabs = [
                {"name": "League", "selector": "button:has-text('League')"},
                {"name": "Domestic Cup", "selector": "button:has-text('Domestic Cup')"},
                {"name": "International Cup", "selector": "button:has-text('International Cup')"},
                {"name": "National Team", "selector": "button:has-text('National Team')"}
            ]
            
            captured_data = []
            
            for i, tab in enumerate(tabs):
                try:
                    print(f"\n📸 Capturing '{tab['name']}' tab...")
                    
                    # Find and click tab
                    tab_element = page.locator(tab["selector"]).first
                    
                    if not tab_element.is_visible(timeout=5000):
                        print(f"  ⚠️ Tab not found")
                        continue
                    
                    # Check if already selected
                    is_selected = tab_element.get_attribute("data-selected") == "true"
                    
                    if not is_selected:
                        print(f"  🖱️  Clicking tab...")
                        page.evaluate("(element) => element.click()", tab_element.element_handle())
                        page.wait_for_timeout(2000)
                    
                    # Take screenshot
                    screenshot_path = f"{output_dir}/{i+1}_{tab['name'].replace(' ', '_')}.png"
                    page.screenshot(path=screenshot_path, full_page=True)
                    print(f"  ✓ Screenshot saved: {screenshot_path}")
                    
                    # Save HTML
                    html_path = f"{output_dir}/{i+1}_{tab['name'].replace(' ', '_')}.html"
                    html_content = page.content()
                    with open(html_path, 'w', encoding='utf-8') as f:
                        f.write(html_content)
                    print(f"  ✓ HTML saved: {html_path}")
                    
                    # Try to find career table container
                    # Look for common patterns
                    possible_selectors = [
                        "[class*='career']",
                        "[class*='table']",
                        "[class*='stats']",
                        "[class*='row']",
                        "[data-testid*='career']",
                        "[data-testid*='table']"
                    ]
                    
                    for selector in possible_selectors:
                        try:
                            elements = page.locator(selector).all()
                            if elements:
                                print(f"  📊 Found {len(elements)} elements matching '{selector}'")
                                
                                # Save first few elements' HTML
                                for j, elem in enumerate(elements[:3]):
                                    try:
                        elem_html = elem.inner_html()
                                        elem_path = f"{output_dir}/{i+1}_{tab['name'].replace(' ', '_')}_element_{j}_{selector.replace('[', '').replace(']', '').replace('*=', '')}.html"
                                        with open(elem_path, 'w', encoding='utf-8') as f:
                                            f.write(elem_html)
                                    except:
                                        pass
                                break
                        except:
                            continue
                    
                    captured_data.append({
                        "tab": tab['name'],
                        "screenshot": screenshot_path,
                        "html": html_path
                    })
                
                except Exception as e:
                    print(f"  ⚠️ Error: {str(e)}")
            
            browser.close()
            
            print(f"\n✅ Capture complete!")
            print(f"📁 Files saved to: {output_dir}")
            print("\nCaptured files:")
            for data in captured_data:
                print(f"  - {data['tab']}")
                print(f"    Screenshot: {data['screenshot']}")
                print(f"    HTML: {data['html']}")
            
            return {
                "success": True,
                "output_dir": output_dir,
                "captured": captured_data
            }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Capture failed: {str(e)}"
        }

if __name__ == "__main__":
    result = capture_flashscore_data()
    print("\n" + json.dumps(result, indent=2))
