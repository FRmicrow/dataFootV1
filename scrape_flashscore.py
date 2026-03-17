#!/usr/bin/env python3
import argparse
import json
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from bs4 import BeautifulSoup
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


def slug_to_name(value: str) -> str:
    return "".join(part.capitalize() for part in value.split("-") if part)


def sanitize_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("_")


def ensure_suffix_slash(url: str) -> str:
    return url if url.endswith("/") else url + "/"


def build_match_tab_url(match_url: str, tab_path: str) -> str:
    parsed = urlparse(match_url)
    path = parsed.path.rstrip("/")
    query = parsed.query
    if tab_path:
        path = f"{path}/{tab_path.strip('/')}/"
    else:
        path = path + "/"
    return urlunparse((parsed.scheme, parsed.netloc, path, "", query, ""))


def extract_mid(url: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    mid = query.get("mid", [""])[0]
    if mid:
        return mid
    parts = [part for part in parsed.path.split("/") if part]
    for part in reversed(parts):
        if re.fullmatch(r"[A-Za-z0-9]{8}", part):
            return part
    return sanitize_name(parsed.path.split("/")[-1] or "match")


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_results_url(results_url: str) -> Tuple[str, str]:
    parsed = urlparse(results_url)
    segments = [segment for segment in parsed.path.split("/") if segment]
    if len(segments) < 4:
        raise ValueError(f"Unexpected Flashscore results URL: {results_url}")
    league_season = segments[2]
    season_match = re.search(r"(.+)-(\d{4})-(\d{4})$", league_season)
    if not season_match:
        raise ValueError(f"Could not derive league and season from URL: {results_url}")
    league_slug = season_match.group(1)
    season_label = f"{season_match.group(2)}-{season_match.group(3)}"
    return slug_to_name(league_slug), season_label


@dataclass
class MatchRecord:
    index: int
    url: str
    mid: str


def parse_incidents(summary_soup: BeautifulSoup) -> Tuple[List[dict], List[dict]]:
    incidents: List[dict] = []
    sections: List[dict] = []
    current_section: Optional[dict] = None

    detail = summary_soup.select_one("#detail")
    if not detail:
        return incidents, sections

    for child in detail.descendants:
        if not getattr(child, "name", None):
            continue

        classes = child.get("class") or []
        class_set = set(classes)
        if "wclHeaderSection--summary" in class_set:
            texts = [item.get_text(" ", strip=True) for item in child.select('[data-testid="wcl-scores-overline-02"]')]
            section_name = texts[0] if texts else child.get_text(" ", strip=True)
            section_score = texts[1] if len(texts) > 1 else ""
            current_section = {
                "title": section_name,
                "score": section_score,
                "incidents": [],
            }
            sections.append(current_section)
            continue

        if "smv__participantRow" not in class_set:
            continue

        side = "home" if "smv__homeParticipant" in class_set else "away"
        incident_node = child.select_one(".smv__incident")
        if not incident_node:
            continue

        minute = incident_node.select_one(".smv__timeBox")
        title_node = incident_node.select_one("svg title")
        title = title_node.get_text(" ", strip=True) if title_node else ""
        player_nodes = incident_node.select(".smv__playerName")
        player = player_nodes[0].get_text(" ", strip=True) if player_nodes else ""
        sub_out = incident_node.select_one(".smv__subDown")
        assist = incident_node.select_one(".smv__assist a")
        event_type = "other"
        lower_title = title.lower()
        if "but" in lower_title:
            event_type = "goal"
        elif "contre son camp" in lower_title:
            event_type = "goal"
        elif "carton" in lower_title:
            event_type = "card"
        elif "changement" in lower_title:
            event_type = "substitution"

        score_nodes = incident_node.select(".smv__incidentHomeScore, .smv__incidentAwayScore")
        score_parts = [node.get_text(" ", strip=True) for node in score_nodes if node.get_text(" ", strip=True)]

        incident = {
            "minute": minute.get_text(" ", strip=True) if minute else "",
            "side": side,
            "type": event_type,
            "title": title,
            "player": player,
            "player_out": sub_out.get_text(" ", strip=True) if sub_out else "",
            "assist": assist.get_text(" ", strip=True) if assist else "",
            "score": "-".join(score_parts) if score_parts else "",
        }
        incidents.append(incident)
        if current_section is not None:
            current_section["incidents"].append(incident)

    return incidents, sections


def parse_stats(stats_soup: BeautifulSoup) -> dict:
    result = {"sections": [], "rows": []}
    detail = stats_soup.select_one("#detail")
    if not detail:
        return result

    for section in detail.select(".tabContent__match-statistics .section"):
        title_node = section.select_one(".section__title")
        title = title_node.get_text(" ", strip=True) if title_node else ""
        rows = []
        for row in section.select('[data-testid="wcl-statistics"]'):
            values = row.select('[data-testid="wcl-statistics-value"]')
            label_node = row.select_one('[data-testid="wcl-statistics-category"]')
            if len(values) < 2 or not label_node:
                continue
            entry = {
                "label": label_node.get_text(" ", strip=True),
                "home": values[0].get_text(" ", strip=True),
                "away": values[1].get_text(" ", strip=True),
            }
            rows.append(entry)
            result["rows"].append({**entry, "section": title})

        if title or rows:
            result["sections"].append({"title": title, "rows": rows})

    return result


def parse_lineups(lineups_soup: BeautifulSoup) -> dict:
    detail = lineups_soup.select_one("#detail")
    if not detail:
        return {}

    formations = [node.get_text(" ", strip=True) for node in detail.select(".lf__formation")]
    lineup_nodes = detail.select(".lf__lineUp")
    start_titles = [node.get_text(" ", strip=True) for node in detail.select(".section .section__title")]
    substituted_players = [node.get_text(" ", strip=True) for node in detail.select(".lf__participantName")]

    return {
        "formations": formations,
        "section_titles": start_titles,
        "participants_text": substituted_players,
        "raw_text": detail.get_text(" ", strip=True),
        "lineup_blocks": len(lineup_nodes),
    }


def parse_match_json(match: MatchRecord, pages: Dict[str, str]) -> dict:
    summary_soup = BeautifulSoup(pages["summary"], "html.parser")
    stats_global_soup = BeautifulSoup(pages["stats_global"], "html.parser")
    stats_1h_soup = BeautifulSoup(pages["stats_1st_half"], "html.parser")
    stats_2h_soup = BeautifulSoup(pages["stats_2nd_half"], "html.parser")
    lineups_soup = BeautifulSoup(pages["lineups"], "html.parser")

    detail = summary_soup.select_one("#detail")
    breadcrumbs = [node.get_text(" ", strip=True) for node in detail.select(".wcl-breadcrumbItemLabel_2QT1M")[:3]] if detail else []
    teams = detail.select(".participant__participantNameWrapper a") if detail else []
    score_spans = detail.select(".detailScore__wrapper span") if detail else []
    kickoff = detail.select_one(".duelParticipant__startTime") if detail else None
    status = detail.select_one(".detailScore__status") if detail else None
    referee = detail.select_one(".mi__item:has(.mi__item__name)") if detail else None

    incidents, summary_sections = parse_incidents(summary_soup)
    goals = [item for item in incidents if item["type"] == "goal"]
    cards = [item for item in incidents if item["type"] == "card"]
    substitutions = [item for item in incidents if item["type"] == "substitution"]

    return {
        "match_id": match.mid,
        "match_url": match.url,
        "competition": breadcrumbs[2] if len(breadcrumbs) >= 3 else "",
        "country": breadcrumbs[1] if len(breadcrumbs) >= 2 else "",
        "sport": breadcrumbs[0] if breadcrumbs else "",
        "kickoff": kickoff.get_text(" ", strip=True) if kickoff else "",
        "status": status.get_text(" ", strip=True) if status else "",
        "home_team": teams[0].get_text(" ", strip=True) if len(teams) >= 1 else "",
        "away_team": teams[1].get_text(" ", strip=True) if len(teams) >= 2 else "",
        "score": {
            "home": score_spans[0].get_text(" ", strip=True) if len(score_spans) >= 1 else "",
            "away": score_spans[2].get_text(" ", strip=True) if len(score_spans) >= 3 else "",
        },
        "summary": {
            "sections": summary_sections,
            "incidents": incidents,
            "goals": goals,
            "cards": cards,
            "substitutions": substitutions,
        },
        "stats": {
            "global": parse_stats(stats_global_soup),
            "first_half": parse_stats(stats_1h_soup),
            "second_half": parse_stats(stats_2h_soup),
        },
        "lineups": parse_lineups(lineups_soup),
        "_meta": {
            "generated_at_epoch": int(time.time()),
            "source_pages": list(pages.keys()),
            "has_stats_global": bool(parse_stats(stats_global_soup)["rows"]),
            "has_stats_first_half": bool(parse_stats(stats_1h_soup)["rows"]),
            "has_stats_second_half": bool(parse_stats(stats_2h_soup)["rows"]),
        },
    }


class FlashscoreScraper:
    def __init__(self, output_root: Path, headless: bool = True):
        self.output_root = output_root
        self.headless = headless

    def _new_page(self, browser):
        return browser.new_page(viewport={"width": 1600, "height": 2200})

    def accept_cookies(self, page) -> None:
        candidates = [
            page.locator("button").filter(has_text="J'accepte"),
            page.locator("button").filter(has_text="Tout autoriser"),
        ]
        for locator in candidates:
            if locator.count() > 0:
                try:
                    locator.first.click(timeout=5000)
                    page.wait_for_timeout(1000)
                    return
                except Exception:
                    pass

    def collect_match_links(self, page, results_url: str) -> List[MatchRecord]:
        page.goto(results_url, wait_until="networkidle", timeout=120000)
        page.wait_for_timeout(2500)
        self.accept_cookies(page)

        for _ in range(40):
            load_more = page.locator("button, a").filter(has_text=re.compile("Montrer plus de matchs|Afficher plus de matchs"))
            if load_more.count() == 0:
                break
            load_more.first.scroll_into_view_if_needed()
            load_more.first.click(force=True)
            page.wait_for_timeout(1500)

        links = []
        seen = set()
        loc = page.locator("a.eventRowLink")
        for idx in range(loc.count()):
            href = loc.nth(idx).get_attribute("href")
            if not href or href in seen:
                continue
            seen.add(href)
            links.append(MatchRecord(index=len(links) + 1, url=href, mid=extract_mid(href)))
        return links

    def fetch_page_html(self, page, url: str) -> str:
        page.goto(url, wait_until="networkidle", timeout=120000)
        page.wait_for_timeout(1500)
        page.wait_for_selector("#detail", timeout=120000)
        return page.content()

    def scrape_match(self, browser, match: MatchRecord, raw_dir: Path, json_dir: Path) -> dict:
        file_prefix = f"{match.index:03d}_{match.mid}"
        tab_urls = {
            "summary": match.url,
            "stats_global": build_match_tab_url(match.url, "resume/stats/global"),
            "stats_1st_half": build_match_tab_url(match.url, "resume/stats/1-mi-temps"),
            "stats_2nd_half": build_match_tab_url(match.url, "resume/stats/2-mi-temps"),
            "lineups": build_match_tab_url(match.url, "resume/compositions"),
        }

        pages = {}
        for key, url in tab_urls.items():
            page = self._new_page(browser)
            try:
                pages[key] = self.fetch_page_html(page, url)
            finally:
                page.close()

            (raw_dir / f"{file_prefix}_{key}.html").write_text(pages[key], encoding="utf-8")

        payload = parse_match_json(match, pages)
        write_json(json_dir / f"{file_prefix}.json", payload)
        return payload

    def scrape_season(self, results_url: str, limit_matches: Optional[int] = None) -> dict:
        league_name, season_label = parse_results_url(results_url)
        season_root = self.output_root / league_name / season_label
        raw_dir = season_root / "html"
        json_dir = season_root / "json"
        raw_dir.mkdir(parents=True, exist_ok=True)
        json_dir.mkdir(parents=True, exist_ok=True)

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=self.headless)
            index_page = self._new_page(browser)
            try:
                matches = self.collect_match_links(index_page, ensure_suffix_slash(results_url))
                if limit_matches is not None:
                    matches = matches[:limit_matches]

                results_html = index_page.content()
                (raw_dir / "_results_page.html").write_text(results_html, encoding="utf-8")
                write_json(
                    season_root / "_matches_index.json",
                    {
                        "league": league_name,
                        "season": season_label,
                        "results_url": ensure_suffix_slash(results_url),
                        "matches": [match.__dict__ for match in matches],
                    },
                )
            finally:
                index_page.close()

            ok = 0
            failed = 0
            failures = []
            for match in matches:
                try:
                    self.scrape_match(browser, match, raw_dir, json_dir)
                    ok += 1
                except PlaywrightTimeoutError as exc:
                    failed += 1
                    failures.append({"match_id": match.mid, "url": match.url, "error": f"timeout: {exc}"})
                except Exception as exc:
                    failed += 1
                    failures.append({"match_id": match.mid, "url": match.url, "error": str(exc)})

            browser.close()

        summary = {
            "league": league_name,
            "season": season_label,
            "results_url": ensure_suffix_slash(results_url),
            "output_dir": str(season_root),
            "raw_dir": str(raw_dir),
            "json_dir": str(json_dir),
            "matches_total": len(matches),
            "matches_ok": ok,
            "matches_failed": failed,
            "failures": failures[:50],
        }
        write_json(season_root / "_summary.json", summary)
        return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Scrape Flashscore match details to HTML and JSON.")
    parser.add_argument("--results-url", required=True, help="Flashscore results URL for a season.")
    parser.add_argument("--output-root", default="FlashscoreFixtureDetail", help="Root output directory.")
    parser.add_argument("--limit-matches", type=int, help="Optional limit for testing.")
    parser.add_argument("--headed", action="store_true", help="Run browser in headed mode.")
    args = parser.parse_args()

    scraper = FlashscoreScraper(Path(args.output_root), headless=not args.headed)
    summary = scraper.scrape_season(args.results_url, limit_matches=args.limit_matches)
    print(json.dumps(summary, ensure_ascii=False))
    return 0 if summary["matches_failed"] == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
