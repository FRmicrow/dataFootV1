#!/usr/bin/env python3
"""
V47 Phase 1 — Orchestrator for the X.com trends scraper.

Chains: pre-check → verify (before) → scrape (retries+jitter)
        → writer (transactional) → verify (after).

Design rules:
  - Atomicity: if the scraper fails, the writer is never invoked.
  - Idempotence: business key (trend_label, captured_at::date) prevents
    duplicates if this orchestrator runs twice on the same day.
  - Single instance: a lock file (`/tmp/x-trends-scraper.lock`) prevents
    concurrent runs that would corrupt the DB.
  - Anti-ban: jitter before each retry, max-retries cap, circuit breaker
    on captcha (writes a cooldown file with an ISO timestamp).

Usage:
    python3 run-trends-scraper.py [options]

Common flows:
    # Production
    python3 run-trends-scraper.py

    # Dry-run (validate end-to-end but ROLLBACK in writer)
    python3 run-trends-scraper.py --dry-run

    # Save the intermediate JSON for inspection
    python3 run-trends-scraper.py --output=/tmp/trends.json

Exit codes:
    0   success
    1   generic error
    2   bad CLI args
    3   scraper timeout / network — retries exhausted
    4   login wall — re-run login-x-trends.py
    5   captcha — cooldown written, retry later
    6   profile dir missing or cookies expired
    7   DOM structure changed — selectors need an update
    8   no trends parsed (after retries)
    9   in cooldown — another run is suppressed by circuit breaker
    10  another instance is already running (lock held)
    11  writer (Node) failed — DB rolled back
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import random
import signal
import subprocess
import sys
import time
from contextlib import contextmanager
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SCRAPE_SCRIPT = SCRIPT_DIR / "scrape-x-trends.py"
WRITER_SCRIPT = SCRIPT_DIR / "update-x-trends.js"
VERIFY_SCRIPT = SCRIPT_DIR / "verify-trends-run.py"   # may not exist (US5)
DEFAULT_PROFILE_DIR = SCRIPT_DIR / ".x-profile"
DEFAULT_LOCK_FILE = Path("/tmp/x-trends-scraper.lock")
DEFAULT_COOLDOWN_FILE = Path("/tmp/x-trends-scraper.cooldown")

# Scraper exit codes — mirror scrape-x-trends.py
SC_OK = 0
SC_GENERIC = 1
SC_BAD_ARGS = 2
SC_TIMEOUT = 3
SC_LOGIN_WALL = 4
SC_CAPTCHA = 5
SC_COOKIES = 6
SC_DOM_CHANGED = 7
SC_NO_TRENDS = 8
# Non-retriable: re-running won't help
NON_RETRIABLE = {SC_LOGIN_WALL, SC_COOKIES, SC_DOM_CHANGED, SC_BAD_ARGS}

CAPTCHA_COOLDOWN_HOURS = 6

# Subprocess timeouts (seconds)
SCRAPE_TIMEOUT = 90
WRITER_TIMEOUT = 60
VERIFY_TIMEOUT = 30


def log(level: str, message: str, **kv) -> None:
    """Tiny structured logger — pino-shaped JSON line on stderr."""
    record = {
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "level": level,
        "msg": message,
        "component": "run-trends-scraper",
        **kv,
    }
    sys.stderr.write(json.dumps(record, ensure_ascii=False) + "\n")
    sys.stderr.flush()


# ─── Lock + cooldown handling ───────────────────────────────────────────────

@contextmanager
def acquire_lock(lock_path: Path):
    """
    File-based lock. Stale-tolerant: if the lock is older than 2h, we
    consider it abandoned (a previous run crashed without releasing) and
    take it over.
    """
    if lock_path.exists():
        try:
            mtime = datetime.datetime.fromtimestamp(
                lock_path.stat().st_mtime, tz=datetime.timezone.utc
            )
            age_h = (datetime.datetime.now(datetime.timezone.utc) - mtime).total_seconds() / 3600
            if age_h < 2:
                log("warn", "Another instance is running",
                    lock_path=str(lock_path), age_hours=round(age_h, 2))
                raise SystemExit(10)
            log("warn", "Stale lock found — taking over",
                lock_path=str(lock_path), age_hours=round(age_h, 2))
            lock_path.unlink(missing_ok=True)
        except FileNotFoundError:
            pass
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_path.write_text(str(os.getpid()))
    try:
        yield
    finally:
        try:
            lock_path.unlink(missing_ok=True)
        except OSError:
            pass


def check_cooldown(cooldown_path: Path) -> None:
    if not cooldown_path.exists():
        return
    try:
        until_str = cooldown_path.read_text().strip()
        until = datetime.datetime.fromisoformat(until_str)
        if until.tzinfo is None:
            until = until.replace(tzinfo=datetime.timezone.utc)
    except (OSError, ValueError) as e:
        log("warn", "Unreadable cooldown file — ignoring",
            cooldown_path=str(cooldown_path), error=str(e))
        return
    now = datetime.datetime.now(datetime.timezone.utc)
    if now < until:
        remaining = (until - now).total_seconds() / 60
        log("error", "In cooldown — exiting", until=until.isoformat(),
            remaining_minutes=round(remaining, 1))
        raise SystemExit(9)
    # Expired — clean up
    cooldown_path.unlink(missing_ok=True)


def write_cooldown(cooldown_path: Path, hours: int) -> None:
    until = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=hours)
    cooldown_path.parent.mkdir(parents=True, exist_ok=True)
    cooldown_path.write_text(until.isoformat())
    log("warn", "Cooldown written", until=until.isoformat(), hours=hours)


# ─── Subprocess helpers ─────────────────────────────────────────────────────

def run_scraper(args: argparse.Namespace, *, attempt: int) -> tuple[int, bytes, bytes]:
    """Run scrape-x-trends.py once. Returns (exit_code, stdout, stderr)."""
    cmd = [sys.executable, str(SCRAPE_SCRIPT),
           "--profile-dir", str(args.profile_dir)]
    if args.user_agent:
        cmd += ["--user-agent", args.user_agent]
    if args.headful:
        cmd += ["--headful"]

    log("info", "Launching scraper",
        attempt=attempt, max_retries=args.max_retries, cmd=" ".join(cmd))

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            timeout=SCRAPE_TIMEOUT,
            check=False,
        )
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired as e:
        log("error", "Scraper subprocess timeout",
            timeout_s=SCRAPE_TIMEOUT, attempt=attempt)
        return SC_TIMEOUT, e.stdout or b"", e.stderr or b""


def run_writer(payload_json: bytes, *, dry_run: bool) -> tuple[int, bytes, bytes]:
    """Pipe the payload into update-x-trends.js. Returns (code, stdout, stderr)."""
    cmd = ["node", str(WRITER_SCRIPT)]
    if dry_run:
        cmd.append("--dry-run")

    log("info", "Launching writer", dry_run=dry_run, payload_bytes=len(payload_json))

    try:
        proc = subprocess.run(
            cmd,
            input=payload_json,
            capture_output=True,
            timeout=WRITER_TIMEOUT,
            check=False,
        )
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired as e:
        log("error", "Writer subprocess timeout", timeout_s=WRITER_TIMEOUT)
        return 1, e.stdout or b"", e.stderr or b""


def run_verify(*, label: str) -> None:
    """Run verify-trends-run.py if present. Best-effort — never fail the run."""
    if not VERIFY_SCRIPT.exists():
        log("info", "verify-trends-run.py not present — skipping",
            label=label, expected=str(VERIFY_SCRIPT))
        return
    cmd = [sys.executable, str(VERIFY_SCRIPT)]
    try:
        proc = subprocess.run(
            cmd, capture_output=True, timeout=VERIFY_TIMEOUT, check=False
        )
        # Verifier writes its human-readable report on stdout; relay it.
        if proc.stdout:
            sys.stdout.write(f"\n[verify {label}]\n")
            sys.stdout.write(proc.stdout.decode("utf-8", errors="replace"))
            sys.stdout.flush()
        if proc.returncode != 0:
            log("warn", "Verifier non-zero exit", label=label, code=proc.returncode)
    except subprocess.TimeoutExpired:
        log("warn", "Verifier timeout — skipping", label=label, timeout_s=VERIFY_TIMEOUT)


# ─── Profile pre-check (cheap, before launching anything) ──────────────────

def precheck_profile(profile_dir: Path) -> None:
    if not profile_dir.exists():
        log("error", "Profile dir missing — run login-x-trends.py first",
            profile_dir=str(profile_dir))
        raise SystemExit(SC_COOKIES)
    cookies_db = profile_dir / "Default" / "Cookies"
    cookies_alt = profile_dir / "Cookies"
    if not (cookies_db.exists() or cookies_alt.exists()):
        log("error", "No Chromium Cookies DB inside profile — run login-x-trends.py first",
            profile_dir=str(profile_dir))
        raise SystemExit(SC_COOKIES)


# ─── Main retry loop ────────────────────────────────────────────────────────

def scrape_with_retries(args: argparse.Namespace) -> bytes:
    """Run the scraper with retries + jitter. Returns the JSON payload (bytes)."""
    last_code = SC_GENERIC
    last_stderr = b""

    for attempt in range(1, args.max_retries + 2):  # +1 because first attempt is not a retry
        if attempt > 1:
            jitter = random.uniform(5, 30)
            log("info", "Sleeping before retry", attempt=attempt, sleep_s=round(jitter, 1))
            time.sleep(jitter)

        code, stdout, stderr = run_scraper(args, attempt=attempt)
        last_code = code
        last_stderr = stderr

        if code == SC_OK:
            return stdout

        # Surface stderr lines to user
        if stderr:
            sys.stderr.write(stderr.decode("utf-8", errors="replace"))

        if code in NON_RETRIABLE:
            log("error", "Scraper returned non-retriable exit code",
                code=code, attempt=attempt)
            raise SystemExit(code)

        if code == SC_CAPTCHA:
            log("error", "Captcha detected — writing cooldown and exiting",
                code=code, hours=CAPTCHA_COOLDOWN_HOURS)
            write_cooldown(args.cooldown_file, CAPTCHA_COOLDOWN_HOURS)
            raise SystemExit(SC_CAPTCHA)

    log("error", "Scraper exhausted retries", last_code=last_code,
        max_retries=args.max_retries)
    raise SystemExit(last_code)


# ─── CLI ────────────────────────────────────────────────────────────────────

def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Orchestrate one end-to-end run of the V47 trends scraper."
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate end-to-end but ROLLBACK the writer transaction")
    parser.add_argument("--max-retries", type=int, default=2,
                        help="Number of scraper retries on retriable errors (default: 2)")
    parser.add_argument("--output", type=Path, default=None,
                        help="Save the intermediate JSON payload to this path (debug)")
    parser.add_argument("--user-agent", type=str, default=None,
                        help="Force a specific UA (else picked from user-agents.txt)")
    parser.add_argument("--profile-dir", type=Path, default=DEFAULT_PROFILE_DIR)
    parser.add_argument("--lock-file", type=Path, default=DEFAULT_LOCK_FILE)
    parser.add_argument("--cooldown-file", type=Path, default=DEFAULT_COOLDOWN_FILE)
    parser.add_argument("--headful", action="store_true",
                        help="Run Chromium with visible window (debug only)")
    parser.add_argument("--skip-verify", action="store_true",
                        help="Don't call verify-trends-run.py before/after")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    # Sanity: required scripts exist
    if not SCRAPE_SCRIPT.exists():
        log("error", "Scraper script missing", path=str(SCRAPE_SCRIPT))
        return SC_GENERIC
    if not WRITER_SCRIPT.exists():
        log("error", "Writer script missing", path=str(WRITER_SCRIPT))
        return SC_GENERIC

    log("info", "V47 trends scraper run starting",
        dry_run=args.dry_run, max_retries=args.max_retries,
        profile_dir=str(args.profile_dir))

    # SIGINT/SIGTERM clean exit (releases lock via context manager)
    def _signal_handler(signum, _frame):
        log("warn", "Signal received — aborting", signal=signum)
        raise SystemExit(1)
    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    # Order: cooldown → lock → profile (so a concurrent run dies on the lock,
    # not on a missing profile that would mask the real reason).
    check_cooldown(args.cooldown_file)

    with acquire_lock(args.lock_file):
        precheck_profile(args.profile_dir)

        if not args.skip_verify:
            run_verify(label="before")

        payload_json = scrape_with_retries(args)

        # Save intermediate JSON if asked (debug)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_bytes(payload_json)
            log("info", "Intermediate JSON saved", path=str(args.output))

        # Quick sanity check on payload before piping to writer
        try:
            parsed = json.loads(payload_json)
            n_trends = len(parsed.get("trends", []))
        except json.JSONDecodeError as e:
            log("error", "Scraper output is not valid JSON",
                error=str(e), preview=payload_json[:200].decode("utf-8", errors="replace"))
            return SC_GENERIC
        log("info", "Scraper produced payload", trends=n_trends)

        # Pipe to Node writer
        wcode, wstdout, wstderr = run_writer(payload_json, dry_run=args.dry_run)
        if wstderr:
            sys.stderr.write(wstderr.decode("utf-8", errors="replace"))
        if wstdout:
            # Writer summary on stdout — relay
            sys.stdout.write(wstdout.decode("utf-8", errors="replace"))
            sys.stdout.flush()

        if wcode != 0:
            log("error", "Writer failed — DB rolled back", code=wcode)
            return 11

        log("info", "Writer succeeded", dry_run=args.dry_run)

        if not args.skip_verify:
            run_verify(label="after")

    log("info", "V47 trends scraper run complete")
    return SC_OK


if __name__ == "__main__":
    sys.exit(main())
