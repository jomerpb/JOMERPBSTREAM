#!/usr/bin/env python3
"""
Append-only PCSO history scraper.

Unlike the old scraper, this script NEVER overwrites pcso-history.json.
It only ADDS new (date, game) entries that don't already exist in the file.
Your manually-verified historical data is never touched.

Source: businesslist.ph "Result Today" pages (one result per game per run).

--- GAP-DETECTION ADDITION (this version) ---
After each game is processed, we compute the *expected* most-recent draw
date for that game (based on its known draw-day schedule, same convention
as PCSO_GAME_SCHED in index.html) and compare it against what's actually
on file. If the source page hasn't caught up yet, we print a [GAP] line
to the Action log so it's visible instead of silently passing.

KNOWN LIMITATION: this does NOT know about PCSO-declared holidays or
draw suspensions. A real skipped draw will currently print a false-positive
[GAP] warning. Treat [GAP] lines as "worth a manual look," not as proof
something is broken, until a holiday calendar is added.

This version does NOT change insert/backfill behavior in any way — it is
purely additive logging for you to validate over a week or two before we
consider adding a second catch-up cron run or auto-backfill logic.
"""

import json
import re
import sys
import time
from datetime import datetime, timezone, timedelta, date

import requests
from bs4 import BeautifulSoup

HISTORY_FILE = "pcso-history.json"

# slug -> internal key used in pcso-history.json
GAME_PAGES = {
    "6/58": "https://www.businesslist.ph/lottery/result/ultra-lotto-658",
    "6/55": "https://www.businesslist.ph/lottery/result/grand-lotto-655",
    "6/49": "https://www.businesslist.ph/lottery/result/superlotto-649",
    "6/45": "https://www.businesslist.ph/lottery/result/megalotto-645",
    "6/42": "https://www.businesslist.ph/lottery/result/lotto-642",
}
EZ2_PAGE = "https://www.businesslist.ph/lottery/result/ez2-lotto"

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PCSOHistoryBot/1.0)"}

MONTHS = {
    "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
    "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12,
}

# Draw-day schedules, JS Date.getDay() convention: Sunday=0 ... Saturday=6.
# Must stay in sync with PCSO_GAME_SCHED in index.html.
GAME_SCHED = {
    "6/58": [0, 2, 5],   # Sun, Tue, Fri
    "6/55": [1, 3, 6],   # Mon, Wed, Sat
    "6/49": [0, 2, 4],   # Sun, Tue, Thu
    "6/45": [1, 3, 5],   # Mon, Wed, Fri
    "6/42": [2, 4, 6],   # Tue, Thu, Sat
    "ez2":  [0, 1, 2, 3, 4, 5, 6],  # daily
}


def parse_date_text(text):
    """Parse a date like 'Sunday June 28 2026' or 'June 30, 2026' -> '2026-06-28'."""
    m = re.search(r"([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})", text)
    if not m:
        return None
    month_name, day, year = m.groups()
    month = MONTHS.get(month_name)
    if not month:
        return None
    return f"{int(year):04d}-{month:02d}-{int(day):02d}"


def js_weekday(d):
    """Convert a Python date to JS Date.getDay() convention (Sun=0..Sat=6)."""
    return (d.weekday() + 1) % 7


def most_recent_scheduled_date(sched_days, ref_date):
    """Walk backwards from ref_date to the most recent date whose weekday
    is in sched_days (inclusive of ref_date itself)."""
    d = ref_date
    for _ in range(14):  # safety bound, schedules never go >7 days between draws
        if js_weekday(d) in sched_days:
            return d
        d = d - timedelta(days=1)
    return ref_date  # fallback, should never hit


def fetch_latest_6ball(url):
    """Scrape the 'Result Today' block on a 6-ball game page."""
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    header = soup.find(string=re.compile(r"Lotto Result Today"))
    if not header:
        return None

    # date line appears as bolded text near the top of the "Result Today" section
    date_el = soup.find(string=re.compile(r"[A-Za-z]+\s+\|\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4}"))
    date_iso = parse_date_text(date_el) if date_el else None

    # winning numbers: look for the first run of 6 two-digit number spans after the date
    nums = []
    for tag in soup.find_all(string=re.compile(r"^\d{1,2}$")):
        val = tag.strip()
        if val.isdigit() and 1 <= int(val) <= 58:
            nums.append(int(val))
        if len(nums) == 6:
            break

    jackpot_m = re.search(r"JACKPOT:\s*\*?\*?([\d,\.]+)", resp.text)
    winners_m = re.search(r"WINNERS:\s*\*?\*?(\d+)", resp.text)

    if not date_iso or len(nums) != 6:
        return None

    return {
        "date": date_iso,
        "nums": nums,
        "jackpot": jackpot_m.group(1).replace(",", "") if jackpot_m else None,
        "winners": int(winners_m.group(1)) if winners_m else None,
    }


def fetch_latest_ez2(url):
    """Scrape today's EZ2 results (2PM/5PM/9PM) from the EZ2 page."""
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    text = resp.text

    date_el_m = re.search(r"([A-Za-z]+\s+\|\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4})", text)
    date_iso = parse_date_text(date_el_m.group(1)) if date_el_m else None
    if not date_iso:
        return None

    draws = {}
    for hour in ["2PM", "5PM", "9PM"]:
        m = re.search(hour + r"[^\d]{0,80}?(\d{1,2})[^\d]{1,10}?(\d{1,2})", text)
        if m:
            draws[hour] = [int(m.group(1)), int(m.group(2))]

    if not draws:
        return None

    return {"date": date_iso, "draws": draws, "jackpot": "4,000", "winners": None}


def load_history():
    with open(HISTORY_FILE, "r") as f:
        return json.load(f)


def save_history(data):
    data["updated"] = datetime.now(timezone(timedelta(hours=8))).isoformat()
    with open(HISTORY_FILE, "w") as f:
        json.dump(data, f, indent=2)


def check_gap(game_label, sched_key, history):
    """Compare the most recent date on file against the expected most recent
    scheduled draw date. Prints a [GAP] line if they don't match. Never raises."""
    ph_today = datetime.now(timezone(timedelta(hours=8))).date()
    expected = most_recent_scheduled_date(GAME_SCHED[sched_key], ph_today)
    entries = history.get(sched_key, [])
    on_file = entries[0]["date"] if entries else None
    on_file_date = date.fromisoformat(on_file) if on_file else None

    if on_file_date is None or on_file_date < expected:
        print(f"[GAP] {game_label}: expected most recent draw {expected.isoformat()}, "
              f"most recent on file is {on_file or 'NONE'}. "
              f"(Could be a real source lag, or a legitimate PCSO holiday/suspension "
              f"— no holiday calendar yet, verify manually.)")
    else:
        print(f"[ok] {game_label}: most recent on file ({on_file}) meets or exceeds "
              f"expected ({expected.isoformat()})")


def main():
    history = load_history()
    added = 0

    for game_key, url in GAME_PAGES.items():
        try:
            entry = fetch_latest_6ball(url)
        except Exception as e:
            print(f"[warn] failed to fetch {game_key}: {e}", file=sys.stderr)
            entry = None

        if entry:
            existing_dates = {e["date"] for e in history.get(game_key, [])}
            if entry["date"] not in existing_dates:
                history.setdefault(game_key, []).insert(0, entry)
                added += 1
                print(f"[add] {game_key} {entry['date']}: {entry['nums']}")
            else:
                print(f"[skip] {game_key} {entry['date']} already present")
        else:
            print(f"[warn] could not parse {game_key} page")

        time.sleep(1)  # be polite between requests

    try:
        ez2_entry = fetch_latest_ez2(EZ2_PAGE)
    except Exception as e:
        ez2_entry = None
        print(f"[warn] failed to fetch ez2: {e}", file=sys.stderr)

    if ez2_entry:
        existing_dates = {e["date"] for e in history.get("ez2", [])}
        if ez2_entry["date"] not in existing_dates:
            history.setdefault("ez2", []).insert(0, ez2_entry)
            added += 1
            print(f"[add] ez2 {ez2_entry['date']}: {ez2_entry['draws']}")
        else:
            print(f"[skip] ez2 {ez2_entry['date']} already present")

    # --- Gap-detection summary (additive, non-blocking) ---
    print("\n--- GAP CHECK ---")
    for sched_key in GAME_PAGES.keys():
        check_gap(sched_key, sched_key, history)
    check_gap("ez2", "ez2", history)
    print("--- END GAP CHECK ---\n")

    if added > 0:
        save_history(history)
        print(f"Done. Added {added} new entries.")
    else:
        print("Done. No new entries found (nothing to commit).")


if __name__ == "__main__":
    main()
