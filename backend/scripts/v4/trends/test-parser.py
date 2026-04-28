#!/usr/bin/env python3
"""
V47 — Standalone test runner for the X.com trends parser.

Tests the pure parsing functions in scrape-x-trends.py against fixture
HTML files. No network, no Playwright, no DB. Run via:

    python3 backend/scripts/v4/trends/test-parser.py

Or as a module via unittest discovery:

    python3 -m unittest backend.scripts.v4.trends.test_parser

Exit code 0 if all tests pass, 1 if any fail.
"""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

# scrape-x-trends.py uses a hyphen so we can't `import` it normally.
# Load it via importlib instead.
_SCRIPT_DIR = Path(__file__).resolve().parent
_SCRAPER_PATH = _SCRIPT_DIR / "scrape-x-trends.py"

_spec = importlib.util.spec_from_file_location("scrape_x_trends", _SCRAPER_PATH)
_scraper = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_scraper)

parse_trends_from_html = _scraper.parse_trends_from_html
detect_login_wall = _scraper.detect_login_wall
detect_captcha = _scraper.detect_captcha
_parse_post_count = _scraper._parse_post_count
_infer_trend_type = _scraper._infer_trend_type
LoginWallError = _scraper.LoginWallError
CaptchaError = _scraper.CaptchaError
DomStructureError = _scraper.DomStructureError
NoTrendsError = _scraper.NoTrendsError

FIXTURES_DIR = _SCRIPT_DIR / "fixtures"


def load_fixture(name: str) -> str:
    p = FIXTURES_DIR / name
    if not p.exists():
        raise FileNotFoundError(f"Fixture not found: {p}")
    return p.read_text(encoding="utf-8")


class TestParsePostCount(unittest.TestCase):
    def test_k_suffix(self):
        self.assertEqual(_parse_post_count("142K posts"), 142_000)

    def test_m_suffix_decimal(self):
        self.assertEqual(_parse_post_count("1.2M posts"), 1_200_000)

    def test_b_suffix(self):
        self.assertEqual(_parse_post_count("3B posts"), 3_000_000_000)

    def test_plain_number(self):
        self.assertEqual(_parse_post_count("250 posts"), 250)

    def test_comma_thousands(self):
        self.assertEqual(_parse_post_count("86,500 posts"), 86_500)

    def test_singular_post(self):
        self.assertEqual(_parse_post_count("1 post"), 1)

    def test_unparseable(self):
        self.assertIsNone(_parse_post_count("Sports · Trending"))

    def test_empty(self):
        self.assertIsNone(_parse_post_count(""))

    def test_none_safe(self):
        self.assertIsNone(_parse_post_count("not a count"))


class TestInferTrendType(unittest.TestCase):
    def test_hashtag(self):
        self.assertEqual(_infer_trend_type("#ElClasico"), "hashtag")

    def test_event_dash(self):
        self.assertEqual(_infer_trend_type("Real Madrid - Barcelona"), "event")

    def test_event_vs(self):
        self.assertEqual(_infer_trend_type("France vs Spain"), "event")

    def test_event_v(self):
        self.assertEqual(_infer_trend_type("Manchester v Liverpool"), "event")

    def test_topic_simple(self):
        self.assertEqual(_infer_trend_type("Mbappé"), "topic")

    def test_topic_with_dash_but_lowercase(self):
        # "score - update" has a dash but the right side is lowercase
        # → not an event
        self.assertEqual(_infer_trend_type("score - update"), "topic")

    def test_empty_label(self):
        self.assertEqual(_infer_trend_type(""), "topic")


class TestDetectLoginWall(unittest.TestCase):
    def test_login_wall_fixture(self):
        html = load_fixture("x-explore-sports-login-wall.html")
        self.assertTrue(detect_login_wall(html))

    def test_happy_fixture_is_not_login(self):
        html = load_fixture("x-explore-sports-happy.html")
        self.assertFalse(detect_login_wall(html))


class TestDetectCaptcha(unittest.TestCase):
    def test_no_captcha_in_happy_fixture(self):
        html = load_fixture("x-explore-sports-happy.html")
        self.assertFalse(detect_captcha(html))

    def test_captcha_iframe_detected(self):
        html = (
            '<html><body>'
            '<iframe src="https://challenges.cloudflare.com/turnstile/captcha"></iframe>'
            '</body></html>'
        )
        self.assertTrue(detect_captcha(html))

    def test_challenge_testid_detected(self):
        html = (
            '<html><body>'
            '<div data-testid="challenge">Verify you are human</div>'
            '</body></html>'
        )
        self.assertTrue(detect_captcha(html))


class TestParseTrendsHappyPath(unittest.TestCase):
    """C1 — happy-path canary."""

    def setUp(self):
        self.html = load_fixture("x-explore-sports-happy.html")
        self.trends = parse_trends_from_html(self.html)

    def test_five_trends_parsed(self):
        self.assertEqual(len(self.trends), 5)

    def test_rank_positions_are_sequential(self):
        ranks = [t["rank_position"] for t in self.trends]
        self.assertEqual(ranks, [1, 2, 3, 4, 5])

    def test_labels_match_expected(self):
        labels = [t["trend_label"] for t in self.trends]
        self.assertEqual(
            labels,
            ["Mbappé", "#ElClasico", "Real Madrid - Barcelona", "Haaland", "France vs Spain"],
        )

    def test_trend_types_inferred(self):
        types = [t["trend_type"] for t in self.trends]
        self.assertEqual(types, ["topic", "hashtag", "event", "topic", "event"])

    def test_post_counts_parsed(self):
        counts = [t["post_count"] for t in self.trends]
        self.assertEqual(counts, [142_000, None, 1_200_000, 86_500, 42_000])


class TestParseTrendsCanaryFailures(unittest.TestCase):
    """C2 + C3 — DOM regression canaries."""

    def test_login_wall_raises(self):
        html = load_fixture("x-explore-sports-login-wall.html")
        with self.assertRaises(LoginWallError):
            parse_trends_from_html(html)

    def test_no_cards_raises_dom_structure(self):
        html = load_fixture("x-explore-sports-no-cards.html")
        with self.assertRaises(DomStructureError):
            parse_trends_from_html(html)

    def test_empty_cards_raises_no_trends(self):
        html = load_fixture("x-explore-sports-empty-cards.html")
        with self.assertRaises(NoTrendsError):
            parse_trends_from_html(html)


if __name__ == "__main__":
    unittest.main(verbosity=2)
