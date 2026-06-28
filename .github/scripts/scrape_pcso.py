#!/usr/bin/env python3
"""
PCSO Scraper v7
===============
Replaces PCSOLotto-Webscraper library which crashes with NoneType when
PCSO's ASP.NET hidden fields are not accessible.

Strategy:
  PRIMARY   — Direct POST to pcso.gov.ph/SearchLottoResult.aspx
              (replicates what the library does, but with guards + retries)
  FALLBACK  — If PCSO blocks, scrape lottopcso.com via Playwright headless

Output: pcso_results.json
"""

import json
import re
import sys
import time
import calendar
from datetime import datetime, timedelta, timezone

import requests
from bs4 import BeautifulSoup

# ── Config ─────────────────────────────────────────────────────────────────────
PCSO_URL    = "https://www.pcso.gov.ph/SearchLottoResult.aspx"
OUTPUT_FILE = "pcso_results.json"
DAYS_BACK   = 3
PH_TZ_OFFSET = 8   # UTC+8

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.pcso.gov.ph/",
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def ph_now() -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=PH_TZ_OFFSET)


def date_range(start: datetime, end: datetime):
    """Yield dates from start to end inclusive."""
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)


# ── Primary: direct PCSO POST ──────────────────────────────────────────────────

def fetch_asp_hidden_vals(session: requests.Session) -> dict | None:
    """GET the search page and extract ASP.NET hidden form fields."""
    try:
        r = session.get(PCSO_URL, headers=HEADERS, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        vs   = soup.find(id="__VIEWSTATE")
        vsg  = soup.find(id="__VIEWSTATEGENERATOR")
        ev   = soup.find(id="__EVENTVALIDATION")

        # Guard: if any field is missing, the page didn't load properly
        if not vs or not vsg or not ev:
            print("  ASP fields missing — PCSO page may have changed or blocked request")
            return None

        return {
            "__VIEWSTATE":          vs["value"],
            "__VIEWSTATEGENERATOR": vsg["value"],
            "__EVENTVALIDATION":    ev["value"],
        }
    except Exception as e:
        print(f"  GET pcso.gov.ph failed: {e}")
        return None


def post_pcso_results(
    session: requests.Session,
    asp_vals: dict,
    start: datetime,
    end: datetime,
) -> BeautifulSoup | None:
    """POST the search form and return the result soup."""
    try:
        data = {
            "ctl00$ctl00$cphContainer$cpContent$ddlStartMonth": calendar.month_name[start.month],
            "ctl00$ctl00$cphContainer$cpContent$ddlStartDate":  str(start.day),
            "ctl00$ctl00$cphContainer$cpContent$ddlStartYear":  str(start.year),
            "ctl00$ctl00$cphContainer$cpContent$ddlEndMonth":   calendar.month_name[end.month],
            "ctl00$ctl00$cphContainer$cpContent$ddlEndDay":     str(end.day),
            "ctl00$ctl00$cphContainer$cpContent$ddlEndYear":    str(end.year),
            "ctl00$ctl00$cphContainer$cpContent$ddlSelectGame": "0",
            "ctl00$ctl00$cphContainer$cpContent$btnSearch":     "Search Lotto Result",
            "__VIEWSTATE":          asp_vals["__VIEWSTATE"],
            "__VIEWSTATEGENERATOR": asp_vals["__VIEWSTATEGENERATOR"],
            "__EVENTVALIDATION":    asp_vals["__EVENTVALIDATION"],
        }
        r = session.post(PCSO_URL, data=data, headers=HEADERS, timeout=30)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        print(f"  POST pcso.gov.ph failed: {e}")
        return None


def parse_pcso_table(soup: BeautifulSoup) -> list[dict]:
    """Parse the results table from PCSO's response page."""
    results = []
    try:
        rows = soup.find_all("tr")
        if len(rows) <= 1:
            print("  No result rows found in PCSO response")
            return []

        for row in rows[1:]:   # skip header
            cells = row.find_all("td")
            if len(cells) < 5:
                continue
            texts = [c.get_text(strip=True) for c in cells]
            try:
                results.append({
                    "game":        texts[0],
                    "combination": texts[1].split("-"),
                    "draw_date":   datetime.strptime(texts[2], "%m/%d/%Y").strftime("%Y/%m/%d"),
                    "jackpot":     "₱" + texts[3],
                    "winners":     int(texts[4]),
                    "draw_time":   None,
                })
            except Exception:
                continue  # skip malformed rows

        print(f"  → {len(results)} draw(s) parsed from PCSO")
    except Exception as e:
        print(f"  Parse error: {e}")
    return results


def scrape_primary(start: datetime, end: datetime) -> list[dict] | None:
    """Primary scraper: POST directly to pcso.gov.ph"""
    print(f"[PRIMARY] Fetching {start.strftime('%Y/%m/%d')} to {end.strftime('%Y/%m/%d')} from pcso.gov.ph...")
    session = requests.Session()

    # Retry up to 3 times
    for attempt in range(1, 4):
        if attempt > 1:
            print(f"  Retry attempt {attempt}/3...")
            time.sleep(3 * attempt)

        asp_vals = fetch_asp_hidden_vals(session)
        if asp_vals is None:
            continue

        soup = post_pcso_results(session, asp_vals, start, end)
        if soup is None:
            continue

        results = parse_pcso_table(soup)
        if results:
            return results
        # Empty result could mean no draws yet today — not necessarily an error
        print("  Empty result set returned")
        return []   # return empty list, not None (no retry needed)

    print("[PRIMARY] All retries exhausted")
    return None


# ── Fallback: Playwright headless ─────────────────────────────────────────────

def scrape_fallback(start: datetime, end: datetime) -> list[dict]:
    """Fallback scraper using Playwright to handle Cloudflare/JS-gated sites."""
    print("[FALLBACK] Attempting Playwright headless scrape of pcso.gov.ph...")
    results = []
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page    = browser.new_page()
            page.set_extra_http_headers({"Accept-Language": "en-US,en;q=0.9"})
            page.goto(PCSO_URL, wait_until="networkidle", timeout=60000)

            # Fill in the form
            page.select_option(
                "select[name='ctl00$ctl00$cphContainer$cpContent$ddlStartMonth']",
                calendar.month_name[start.month]
            )
            page.select_option(
                "select[name='ctl00$ctl00$cphContainer$cpContent$ddlStartDate']",
                str(start.day)
            )
            page.select_option(
                "select[name='ctl00$ctl00$cphContainer$cpContent$ddlStartYear']",
                str(start.year)
            )
            page.select_option(
                "select[name='ctl00$ctl00$cphContainer$cpContent$ddlEndMonth']",
                calendar.month_name[end.month]
            )
            page.select_option(
                "select[name='ctl00$ctl00$cphContainer$cpContent$ddlEndDay']",
                str(end.day)
            )
            page.select_option(
                "select[name='ctl00$ctl00$cphContainer$cpContent$ddlEndYear']",
                str(end.year)
            )
            page.click("input[name='ctl00$ctl00$cphContainer$cpContent$btnSearch']")
            page.wait_for_load_state("networkidle", timeout=30000)

            soup = BeautifulSoup(page.content(), "html.parser")
            browser.close()
            results = parse_pcso_table(soup)
            print(f"[FALLBACK] Playwright got {len(results)} result(s)")

    except ImportError:
        print("[FALLBACK] Playwright not installed — skipping")
    except Exception as e:
        print(f"[FALLBACK] Playwright error: {e}")

    return results


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    now   = ph_now()
    end   = now
    start = now - timedelta(days=DAYS_BACK - 1)

    print(f"PCSO Scraper v7 — {now.strftime('%Y-%m-%d %H:%M')} PH")
    print("=" * 50)
    print(f"Fetching {start.strftime('%Y/%m/%d')} to {end.strftime('%Y/%m/%d')}...")

    # Try primary first
    data = scrape_primary(start, end)

    # If primary failed (None = hard failure, not empty result)
    if data is None:
        data = scrape_fallback(start, end)

    if data:
        print(f"\nTotal draws collected: {len(data)}")
        output = {
            "last_updated": now.strftime("%Y-%m-%d %H:%M:%S PHT"),
            "source":       "pcso.gov.ph",
            "results":      data,
        }
    else:
        print("\nNo data obtained — saving empty json")
        output = {
            "last_updated": now.strftime("%Y-%m-%d %H:%M:%S PHT"),
            "source":       "pcso.gov.ph",
            "results":      [],
        }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Saved → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
