#!/usr/bin/env python3
"""
V47 Phase 1 — One-time login flow for the X.com Trends scraper.

Opens a HEADFUL Chromium with a persistent profile directory.
The user logs in MANUALLY with a dedicated X account.
After the user presses ENTER, the auth_token cookie is verified and
the persistent profile (cookies + localStorage) is saved to disk.
The scraper (`scrape-x-trends.py`) then reuses that profile in headless
mode for subsequent runs.

Usage:
    python3 login-x-trends.py [--profile-dir=PATH] [--timeout-min=N]

Exit codes:
    0  login successful, cookies persisted
    1  auth_token cookie not found (login failed or partial)
    2  bad CLI args
    3  user aborted (Ctrl-C)
"""

from __future__ import annotations

import argparse
import datetime
import sys
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError as e:
    print(
        "[login] ERROR: playwright not installed. Activate the venv:\n"
        "        cd backend/scripts/v4/trends\n"
        "        source .venv/bin/activate\n"
        "        pip install -r requirements.txt && playwright install chromium",
        file=sys.stderr,
    )
    raise SystemExit(1) from e


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_PROFILE_DIR = SCRIPT_DIR / ".x-profile"
LOGIN_URL = "https://x.com/login"
HOME_URL = "https://x.com/home"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="One-time X.com login for the trends scraper."
    )
    parser.add_argument(
        "--profile-dir",
        type=Path,
        default=DEFAULT_PROFILE_DIR,
        help=f"Where to persist cookies (default: {DEFAULT_PROFILE_DIR})",
    )
    parser.add_argument(
        "--timeout-min",
        type=int,
        default=10,
        help="Maximum minutes to wait for user to log in (default: 10)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    profile_dir: Path = args.profile_dir.resolve()
    profile_dir.mkdir(parents=True, exist_ok=True)
    # Tighten permissions — cookies are session-grade secrets
    try:
        profile_dir.chmod(0o700)
    except OSError:
        # Best-effort on Windows / mounts that don't support chmod
        pass

    print(f"[login] Profile dir : {profile_dir}")
    print(f"[login] Login URL   : {LOGIN_URL}")
    print("[login] A Chromium window will open. Log in MANUALLY with the dedicated X account.")
    print("[login] When you reach the home feed, come back here and press ENTER.")
    print(f"[login] (Timeout: {args.timeout_min} minutes — close window or Ctrl-C to abort.)")
    print()

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(profile_dir),
            headless=False,
            viewport={"width": 1280, "height": 900},
        )
        try:
            page = context.new_page()
            page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=30_000)

            try:
                input("[login] Press ENTER once logged in (or Ctrl-C to abort)... ")
            except (KeyboardInterrupt, EOFError):
                print("\n[login] Aborted by user.", file=sys.stderr)
                return 3

            # Verify the auth_token cookie is present on x.com
            cookies = context.cookies(["https://x.com"])
            auth_cookie = next((c for c in cookies if c["name"] == "auth_token"), None)

            if auth_cookie is None:
                print(
                    "[login] ❌ ERROR: auth_token cookie not found after ENTER. "
                    "Did the login complete? Re-run this script.",
                    file=sys.stderr,
                )
                return 1

            print(f"[login] ✅ Login successful. Profile saved to {profile_dir}")

            expires_at = auth_cookie.get("expires", -1)
            if expires_at and expires_at > 0:
                expiry = datetime.datetime.fromtimestamp(
                    expires_at, tz=datetime.timezone.utc
                )
                days_left = (expiry - datetime.datetime.now(datetime.timezone.utc)).days
                print(f"[login] Cookie expires : {expiry.isoformat()} (~{days_left} days)")
            else:
                print("[login] Cookie type    : session (no fixed expiry — persists until manual logout)")
            return 0
        finally:
            context.close()


if __name__ == "__main__":
    sys.exit(main())
