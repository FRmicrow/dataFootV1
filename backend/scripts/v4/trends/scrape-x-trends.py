#!/usr/bin/env python3
"""
V47 Phase 1 — Scraper Playwright pour les trends football de X.com.

Lit https://x.com/explore/tabs/sports avec un profil Chromium persistant
(authentifié via login-x-trends.py), extrait la liste des trends, et émet
un payload JSON conforme à TrendsPayloadSchema sur STDOUT.

⚠️  Ce script ne touche JAMAIS la base de données. C'est uniquement un
    producteur JSON. Le writer Node `update-x-trends.js` consomme STDIN
    et fait l'upsert.

Usage:
    python3 scrape-x-trends.py [options]

Common flows:
    # Production (headless, default UA pool, default profile dir):
    python3 scrape-x-trends.py > /tmp/payload.json

    # Debug (visible browser, save HTML for inspection):
    python3 scrape-x-trends.py --headful --save-html=/tmp/page.html

    # Offline test (parse a saved HTML, no Playwright):
    python3 scrape-x-trends.py --input-html=tests/fixtures/x-explore-sports-happy.html

Exit codes:
    0  success — JSON written to stdout
    1  generic error
    2  bad CLI args
    3  network / Playwright timeout
    4  login wall detected (re-run login-x-trends.py)
    5  captcha or challenge detected
    6  profile dir missing or auth_token cookie expired
    7  DOM structure changed (selectors no longer match)
    8  zero trends found (possible empty state or partial render)
"""

from __future__ import annotations

import argparse
import datetime
import json
import random
import re
import sys
from pathlib import Path

# BeautifulSoup is a hard dep — bs4 ships with playwright for free in most
# environments, but we install it explicitly via requirements.txt.
try:
    from bs4 import BeautifulSoup
except ImportError as e:
    print(
        "[scrape] ERROR: beautifulsoup4 not installed. Activate the venv:\n"
        "        cd backend/scripts/v4/trends\n"
        "        source .venv/bin/activate\n"
        "        pip install -r requirements.txt",
        file=sys.stderr,
    )
    raise SystemExit(1) from e


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_PROFILE_DIR = SCRIPT_DIR / ".x-profile"
DEFAULT_UA_POOL = SCRIPT_DIR / "user-agents.txt"
DEFAULT_SOURCE_URL = "https://x.com/explore/tabs/sports"
SCRAPER_VERSION = "v47.1.0"

# ─── DOM Selectors (FRAGILE — confirm manually against real x.com) ──────────
# These selectors target the "Trending in Sports" cards in the explore tab.
# Update when X.com restructures their DOM.
SEL_TREND_CARD = '[data-testid="trend"]'
# Inside a trend card: the lines are nested divs with dir="ltr".
# Typical render order:
#   line 1 = "Sports · Trending"   (category — ignored)
#   line 2 = the trend label       (e.g. "Mbappé")
#   line 3 = "142K posts"          (post count)
SEL_LINES_IN_CARD = 'div[dir="ltr"]'
# Login wall indicators
SEL_LOGIN_BUTTON = '[data-testid="loginButton"]'
SEL_LOGIN_FORM = 'form[action*="/login"]'
# Captcha / challenge indicators
SEL_CAPTCHA_IFRAME = 'iframe[src*="captcha"]'
SEL_CHALLENGE = '[data-testid="challenge"]'

POST_COUNT_RE = re.compile(r"^([\d,.]+)\s*([KMB])?\s*posts?$", re.IGNORECASE)
EVENT_SEPARATOR_RE = re.compile(r"\s+(?:[-–v]|vs)\s+", re.IGNORECASE)


# ─── Custom exceptions ──────────────────────────────────────────────────────
class LoginWallError(Exception):
    """Raised when X.com redirects to /login or shows the login modal."""


class CaptchaError(Exception):
    """Raised when X.com shows a captcha / Arkose challenge."""


class DomStructureError(Exception):
    """Raised when expected selectors are missing — DOM changed."""


class NoTrendsError(Exception):
    """Raised when the page parses but yields zero trends."""


class CookiesMissingError(Exception):
    """Raised when the persistent profile has no valid auth cookie."""


# ─── Pure functions (testable without Playwright) ───────────────────────────

def detect_login_wall(html: str) -> bool:
    """True if the page is the login wall (no logged-in session)."""
    soup = BeautifulSoup(html, "html.parser")
    if soup.select_one(SEL_LOGIN_BUTTON) is not None:
        return True
    if soup.select_one(SEL_LOGIN_FORM) is not None:
        return True
    # Heuristic: the URL inside <link rel="canonical"> often gives away /login
    canonical = soup.find("link", rel="canonical")
    if canonical and "/login" in (canonical.get("href") or ""):
        return True
    return False


def detect_captcha(html: str) -> bool:
    """True if a captcha or Arkose challenge is in the page."""
    soup = BeautifulSoup(html, "html.parser")
    if soup.select_one(SEL_CAPTCHA_IFRAME) is not None:
        return True
    if soup.select_one(SEL_CHALLENGE) is not None:
        return True
    return False


def _parse_post_count(text: str) -> int | None:
    """
    Parse "142K posts" → 142000, "1.2M posts" → 1200000, "" → None.
    Returns None on unparseable input.
    """
    if not text:
        return None
    text = text.strip()
    m = POST_COUNT_RE.match(text)
    if not m:
        return None
    raw, suffix = m.group(1), m.group(2)
    raw = raw.replace(",", "")
    try:
        value = float(raw)
    except ValueError:
        return None
    multiplier = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}.get(
        (suffix or "").upper(), 1
    )
    return int(value * multiplier)


def _infer_trend_type(label: str) -> str:
    """Classify a label into hashtag | event | topic."""
    if not label:
        return "topic"
    if label.startswith("#"):
        return "hashtag"
    # An "event" looks like "Real Madrid - Barcelona" or "France vs Spain"
    parts = EVENT_SEPARATOR_RE.split(label)
    if len(parts) == 2 and all(p.strip() and p.strip()[0].isupper() for p in parts):
        return "event"
    return "topic"


def parse_trends_from_html(html: str) -> list[dict]:
    """
    Pure parser — extracts trend cards from a rendered HTML string.

    Raises:
        LoginWallError    if the page is the login wall
        CaptchaError      if a captcha is shown
        DomStructureError if the trend card selector finds nothing
        NoTrendsError     if cards are present but none parse correctly
    """
    if detect_login_wall(html):
        raise LoginWallError("Login wall detected on x.com")
    if detect_captcha(html):
        raise CaptchaError("Captcha or challenge detected on x.com")

    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(SEL_TREND_CARD)
    if not cards:
        raise DomStructureError(
            f"Selector '{SEL_TREND_CARD}' matched zero elements — "
            "DOM structure may have changed"
        )

    out: list[dict] = []
    for rank, card in enumerate(cards, start=1):
        # Collect all text lines inside the card. We expect 2 or 3 lines:
        # category (optional), label, post-count (optional).
        lines = [
            el.get_text(strip=True)
            for el in card.select(SEL_LINES_IN_CARD)
            if el.get_text(strip=True)
        ]
        # Some renders wrap the label in <span>s without dir="ltr". Fallback:
        # if we got <2 lines, scan all descendant text segments.
        if len(lines) < 2:
            lines = [
                t.strip()
                for t in card.stripped_strings
                if t.strip()
            ]

        # Drop the category prefix line (e.g. "Sports · Trending")
        meaningful = [
            ln for ln in lines
            if "Trending" not in ln and "·" not in ln and ln != "Sports"
        ]

        if not meaningful:
            # Unrecognized card layout — skip rather than fail entirely
            continue

        label = meaningful[0]
        post_count = None
        for line in meaningful[1:]:
            pc = _parse_post_count(line)
            if pc is not None:
                post_count = pc
                break

        if rank > 50:
            # Hard cap — payload schema rejects > 50 anyway
            break

        out.append({
            "rank_position": rank,
            "trend_label": label,
            "trend_type": _infer_trend_type(label),
            "post_count": post_count,
        })

    if not out:
        raise NoTrendsError(
            f"{len(cards)} trend cards in DOM but none parsed — selectors may be stale"
        )

    return out


# ─── User-Agent pool ────────────────────────────────────────────────────────

def load_user_agents(path: Path) -> list[str]:
    if not path.exists():
        return []
    return [
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]


def pick_user_agent(forced: str | None, pool_path: Path) -> str:
    if forced:
        return forced
    pool = load_user_agents(pool_path)
    if not pool:
        # Fallback — at least we don't ship with a default UA in code
        raise SystemExit(
            f"[scrape] ERROR: user-agents pool empty ({pool_path}). "
            "Add at least one UA or pass --user-agent=...",
        )
    return random.choice(pool)


# ─── Profile / cookie validation ────────────────────────────────────────────

def validate_profile_has_auth(profile_dir: Path) -> None:
    """
    Best-effort check that the persistent profile contains a Chromium
    "Cookies" SQLite file. Full cookie validation happens at request time
    via Playwright's context.cookies(). This pre-flight just stops obviously
    empty profiles before launching a browser.
    """
    if not profile_dir.exists():
        raise CookiesMissingError(
            f"Profile dir {profile_dir} does not exist. Run login-x-trends.py first."
        )
    cookies_db = profile_dir / "Default" / "Cookies"
    if not cookies_db.exists():
        # Some Chromium versions place it directly under profile_dir
        cookies_db_alt = profile_dir / "Cookies"
        if not cookies_db_alt.exists():
            raise CookiesMissingError(
                f"No Chromium cookies DB inside {profile_dir}. "
                "Run login-x-trends.py first."
            )


# ─── Playwright runner ──────────────────────────────────────────────────────

def fetch_html_with_playwright(
    *,
    profile_dir: Path,
    source_url: str,
    user_agent: str,
    headful: bool,
    timeout_ms: int = 30_000,
) -> str:
    """
    Open the persistent context, navigate, wait for trend cards to render,
    return page.content().
    """
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError as e:
        raise SystemExit(
            "[scrape] ERROR: playwright not installed. "
            "See requirements.txt and run: playwright install chromium"
        ) from e

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(profile_dir),
            headless=not headful,
            user_agent=user_agent,
            viewport={"width": 1280, "height": 900},
        )
        try:
            # Verify auth cookie is on x.com before navigating
            cookies = context.cookies(["https://x.com"])
            if not any(c["name"] == "auth_token" for c in cookies):
                raise CookiesMissingError(
                    "auth_token cookie not present in x.com context — "
                    "session expired? Re-run login-x-trends.py."
                )

            page = context.new_page()
            try:
                page.goto(source_url, wait_until="domcontentloaded", timeout=timeout_ms)
            except PWTimeout as e:
                raise SystemExit(
                    f"[scrape] Timeout navigating to {source_url}"
                ) from e

            # Try to wait for trend cards to appear; tolerate if missing
            # (we'll let parse_trends_from_html raise the right error).
            try:
                page.wait_for_selector(SEL_TREND_CARD, timeout=15_000)
            except PWTimeout:
                pass

            return page.content()
        finally:
            context.close()


# ─── CLI ────────────────────────────────────────────────────────────────────

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape football trends from x.com/explore/tabs/sports."
    )
    parser.add_argument("--profile-dir", type=Path, default=DEFAULT_PROFILE_DIR)
    parser.add_argument("--source-url", type=str, default=DEFAULT_SOURCE_URL)
    parser.add_argument("--user-agent", type=str, default=None,
                        help="Force a specific UA (else pick from user-agents.txt)")
    parser.add_argument("--user-agents-path", type=Path, default=DEFAULT_UA_POOL)
    parser.add_argument("--headful", action="store_true",
                        help="Run Chromium with a visible window (debug only)")
    parser.add_argument("--save-html", type=Path, default=None,
                        help="Save the raw HTML to this path before parsing")
    parser.add_argument("--input-html", type=Path, default=None,
                        help="Skip Playwright; parse this HTML file (for tests)")
    parser.add_argument("--scraper-version", type=str, default=SCRAPER_VERSION)
    return parser.parse_args(argv)


def build_payload(*, captured_at: str, source_url: str, scraper_version: str,
                  user_agent: str, trends: list[dict]) -> dict:
    return {
        "captured_at": captured_at,
        "source_url": source_url,
        "scraper_version": scraper_version,
        "user_agent": user_agent,
        "trends": trends,
    }


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    # Resolve the user agent — even in --input-html mode we put one in the payload
    # because TrendsPayloadSchema requires it.
    try:
        user_agent = pick_user_agent(args.user_agent, args.user_agents_path)
    except SystemExit as e:
        print(str(e), file=sys.stderr)
        return 2

    # Offline mode: parse a fixture HTML file
    if args.input_html:
        if not args.input_html.exists():
            print(f"[scrape] ERROR: --input-html file not found: {args.input_html}",
                  file=sys.stderr)
            return 2
        html = args.input_html.read_text(encoding="utf-8")
    else:
        try:
            validate_profile_has_auth(args.profile_dir)
        except CookiesMissingError as e:
            print(f"[scrape] {e}", file=sys.stderr)
            return 6
        try:
            html = fetch_html_with_playwright(
                profile_dir=args.profile_dir,
                source_url=args.source_url,
                user_agent=user_agent,
                headful=args.headful,
            )
        except CookiesMissingError as e:
            print(f"[scrape] {e}", file=sys.stderr)
            return 6
        except SystemExit as e:
            print(str(e), file=sys.stderr)
            return 3

        if args.save_html:
            args.save_html.parent.mkdir(parents=True, exist_ok=True)
            args.save_html.write_text(html, encoding="utf-8")
            print(f"[scrape] Saved raw HTML → {args.save_html}", file=sys.stderr)

    # Parse
    try:
        trends = parse_trends_from_html(html)
    except LoginWallError as e:
        print(f"[scrape] {e}", file=sys.stderr)
        return 4
    except CaptchaError as e:
        print(f"[scrape] {e}", file=sys.stderr)
        return 5
    except DomStructureError as e:
        print(f"[scrape] {e}", file=sys.stderr)
        return 7
    except NoTrendsError as e:
        print(f"[scrape] {e}", file=sys.stderr)
        return 8

    payload = build_payload(
        captured_at=datetime.datetime.now(datetime.timezone.utc)
                    .replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        source_url=args.source_url,
        scraper_version=args.scraper_version,
        user_agent=user_agent,
        trends=trends,
    )
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
