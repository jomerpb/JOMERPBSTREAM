#!/usr/bin/env python3
"""
Append-only PCSO history scraper — v2 (backfill + repair).

Unlike the old scraper, this script NEVER overwrites pcso-history.json's
verified data. It only:
  1. ADDS new (date, game) entries that don't already exist,
  2. REPAIRS existing entries whose jackpot/winners is null (or whose EZ2
     draw hours are missing), filling ONLY the null/missing fields.
Winning numbers of existing entries are never modified.

Source: businesslist.ph pages. Two blocks are read per page:
  - the "Result Today" block (same-day results, may be partial for EZ2),
  - the "Result History" table (last ~30 draws) — used to auto-backfill any
    missed days and to repair null jackpot/winners captured earlier.

--- v2 CHANGES vs v1 ---
* BUGFIX: JACKPOT/WINNERS were extracted from raw HTML (resp.text), but the
  amounts are wrapped in bold tags (e.g. "JACKPOT: <b>55,979,823.38</b>"),
  so the regex never matched and every v1-added entry had jackpot=null.
  v2 runs the regex on soup.get_text() instead (tag-free text).
* NEW: history-table pass per page. Backfills gaps (e.g. EZ2 days skipped
  when the source lagged) and repairs null jackpot/winners in place. Gaps
  and nulls now self-heal on the next run, within the table's ~30-draw window.
* Date parsing handles both table formats: "July 01 2026" (6-ball tables)
  and "02 Jul 2026" (EZ2 table, abbreviated month).
* Jackpot stored as a number (int when whole, else float) to match the
  seeded historical data instead of v1's string.
* [diag] lines are printed when a block that should parse doesn't, so the
  Action log shows exactly what the page looked like.

--- GAP-DETECTION (unchanged from v1) ---
After each game is processed, the expected most-recent draw date is compared
against what's on file; a [GAP] line is printed on mismatch.

KNOWN LIMITATION (unchanged): no PCSO holiday calendar. A legitimately
skipped draw prints a false-positive [GAP]. Gaps older than the source
table's ~30-draw window cannot self-heal.
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
    # abbreviated forms (EZ2 history table uses e.g. "02 Jul 2026")
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "Jun": 6, "Jul": 7,
    "Aug": 8, "Sep": 9, "Sept": 9, "Oct": 10, "Nov": 11, "Dec": 12,
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


# ── date / amount parsing ────────────────────────────────────────────────

def parse_date_text(text):
    """Parse 'July 01 2026', 'June 30, 2026', or '02 Jul 2026' -> '2026-07-01'.

    Weekday prefixes ('Wednesday July 01 2026') are handled implicitly:
    the month-first pattern skips non-month words, and the day-first
    pattern anchors on the digits.
    """
    if not text:
        return None
    # month-first: "July 01 2026" / "June 30, 2026"
    for m in re.finditer(r"([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})", text):
        month = MONTHS.get(m.group(1))
        if month:
            return f"{int(m.group(3)):04d}-{month:02d}-{int(m.group(2)):02d}"
    # day-first: "02 Jul 2026" / "2 July, 2026"
    for m in re.finditer(r"(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})", text):
        month = MONTHS.get(m.group(2))
        if month:
            return f"{int(m.group(3)):04d}-{month:02d}-{int(m.group(1)):02d}"
    return None


def parse_amount(text):
    """'55,979,823.38' -> 55979823.38 ; '45,000,000' -> 45000000 (int).
    Returns None if no number is present."""
    if text is None:
        return None
    m = re.search(r"[\d][\d,]*(?:\.\d+)?", str(text))
    if not m:
        return None
    try:
        val = float(m.group(0).replace(",", ""))
    except ValueError:
        return None
    return int(val) if val.is_integer() else val


def parse_int(text):
    m = re.search(r"\d+", str(text)) if text is not None else None
    return int(m.group(0)) if m else None


def js_weekday(d):
    """Convert a Python date to JS Date.getDay() convention (Sun=0..Sat=6)."""
    return (d.weekday() + 1) % 7


def most_recent_scheduled_date(sched_days, ref_date):
    d = ref_date
    for _ in range(14):
        if js_weekday(d) in sched_days:
            return d
        d = d - timedelta(days=1)
    return ref_date


# ── page scraping ────────────────────────────────────────────────────────

def extract_jackpot_winners(soup):
    """Regex on tag-free text (v1 bug: ran on raw HTML where the amount is
    inside <b>/<strong>, so it never matched)."""
    text = soup.get_text(" ", strip=True)
    jackpot_m = re.search(r"JACKPOT:\s*([\d][\d,]*(?:\.\d+)?)", text)
    winners_m = re.search(r"WINNERS:\s*(\d+)", text)
    if not jackpot_m:
        around = re.search(r".{0,60}JACKPOT.{0,80}", text)
        print(f"[diag] JACKPOT not parsed; page text around it: "
              f"{around.group(0) if around else 'no JACKPOT text on page'}")
    return (
        parse_amount(jackpot_m.group(1)) if jackpot_m else None,
        int(winners_m.group(1)) if winners_m else None,
    )


def fetch_6ball_page(url):
    """Scrape a 6-ball game page. Returns (today_entry_or_None, table_entries)."""
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # --- "Result Today" block (same logic as v1 for date + numbers) ---
    today_entry = None
    header = soup.find(string=re.compile(r"Lotto Result Today"))
    if header:
        date_el = soup.find(string=re.compile(r"[A-Za-z]+\s+\|\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4}"))
        date_iso = parse_date_text(date_el) if date_el else None
        nums = []
        for tag in soup.find_all(string=re.compile(r"^\d{1,2}$")):
            val = tag.strip()
            if val.isdigit() and 1 <= int(val) <= 58:
                nums.append(int(val))
            if len(nums) == 6:
                break
        if date_iso and len(nums) == 6:
            jackpot, winners = extract_jackpot_winners(soup)
            today_entry = {"date": date_iso, "nums": nums,
                           "jackpot": jackpot, "winners": winners}

    # --- "Result History" table: Draw Date | Winning Numbers | Winners | Jackpot ---
    table_entries = parse_6ball_history_table(soup)
    return today_entry, table_entries


def parse_6ball_history_table(soup):
    entries = []
    for table in soup.find_all("table"):
        headers = [c.get_text(" ", strip=True).lower()
                   for c in table.find_all(["th", "td"])[:6]]
        header_blob = " | ".join(headers)
        if "draw date" not in header_blob or "winning" not in header_blob:
            continue
        for tr in table.find_all("tr"):
            cells = [c.get_text(" ", strip=True) for c in tr.find_all("td")]
            if len(cells) < 4:
                continue
            date_iso = parse_date_text(cells[0])
            nums = [int(x) for x in re.findall(r"\d{1,2}", cells[1])]
            if not date_iso or len(nums) != 6:
                continue
            entries.append({
                "date": date_iso,
                "nums": nums,
                "jackpot": parse_amount(cells[3]),
                "winners": parse_int(cells[2]),
            })
        break  # first matching table only
    if not entries:
        print("[diag] no 6-ball history table matched on this page "
              "(headers seen: "
            + "; ".join(" | ".join(c.get_text(' ', strip=True) for c in t.find_all(['th', 'td'])[:5])
                          for t in soup.find_all('table')[:3]) + ")")
    return entries


def fetch_ez2_page(url):
    """Scrape the EZ2 page. Returns (today_entry_or_None, table_entries)."""
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # --- "Result Today" block ---
    # v1 BUG (proven in simulation): the old regex ran over the whole raw
    # HTML with a lax [^\d]{0,80} gap, so on pending days ("2PM ? ?") it
    # skipped the ?s and captured stray digits from the NEXT section,
    # fabricating a wrong same-day entry. v2 scopes to the text between the
    # "Result Today" and "Result Yesterday" headings (body only, to skip the
    # <title>) and requires the digit pair to directly follow the hour label.
    today_entry = None
    body_text = (soup.body or soup).get_text(" ", strip=True)
    seg_m = re.search(
        r"EZ2 Result Today(.*?)(?:EZ2 Result Yesterday|EZ2 Result History|$)",
        body_text, re.S)
    seg = seg_m.group(1) if seg_m else ""
    date_iso = parse_date_text(seg)
    if date_iso:
        draws = {}
        for hour in ["2PM", "5PM", "9PM"]:
            m = re.search(hour + r"\s*[:\-]?\s*(\d{1,2})\s+(\d{1,2})(?!\d)", seg)
            if m:
                pair = [int(m.group(1)), int(m.group(2))]
                if all(1 <= n <= 31 for n in pair):
                    draws[hour] = pair
        if draws:
            today_entry = {"date": date_iso, "draws": draws,
                           "jackpot": 4000, "winners": None}

    # --- History table: Draw Date | 2PM | 5PM | 9PM | Jackpot | Winners ---
    table_entries = parse_ez2_history_table(soup)
    return today_entry, table_entries


def parse_ez2_history_table(soup):
    entries = []
    for table in soup.find_all("table"):
        headers = [c.get_text(" ", strip=True).lower()
                   for c in table.find_all(["th", "td"])[:8]]
        header_blob = " | ".join(headers)
        if "draw date" not in header_blob or "2pm" not in header_blob:
            continue
        for tr in table.find_all("tr"):
            cells = [c.get_text(" ", strip=True) for c in tr.find_all("td")]
            if len(cells) < 6:
                continue
            date_iso = parse_date_text(cells[0])
            if not date_iso:
                continue
            draws = {}
            for idx, hour in ((1, "2PM"), (2, "5PM"), (3, "9PM")):
                pair = [int(x) for x in re.findall(r"\d{1,2}", cells[idx])]
                if len(pair) == 2:      # partial rows (empty hour cell) are skipped per-hour
                    draws[hour] = pair
            if not draws:
                continue
            entries.append({
                "date": date_iso,
                "draws": draws,
                "jackpot": parse_amount(cells[4]),
                "winners": parse_int(cells[5]),
            })
        break
    if not entries:
        print("[diag] no EZ2 history table matched on this page "
              "(headers seen: "
            + "; ".join(" | ".join(c.get_text(' ', strip=True) for c in t.find_all(['th', 'td'])[:6])
                          for t in soup.find_all('table')[:3]) + ")")
    return entries


# ── history file merge (append + repair, never overwrite) ───────────────

def load_history():
    with open(HISTORY_FILE, "r") as f:
        return json.load(f)


def save_history(data):
    data["updated"] = datetime.now(timezone(timedelta(hours=8))).isoformat()
    with open(HISTORY_FILE, "w") as f:
        json.dump(data, f, indent=2)


def _insert_sorted(lst, entry):
    """Insert keeping newest-first order (ISO dates compare lexicographically)."""
    for i, e in enumerate(lst):
        if entry["date"] > e["date"]:
            lst.insert(i, entry)
            return
    lst.append(entry)


def merge_entry(history, game_key, entry):
    """Returns 'add', 'repair', or 'skip'. Existing non-null fields and
    existing winning numbers are NEVER modified."""
    lst = history.setdefault(game_key, [])
    for existing in lst:
        if existing.get("date") != entry["date"]:
            continue
        changed = []
        for field in ("jackpot", "winners"):
            if existing.get(field) is None and entry.get(field) is not None:
                existing[field] = entry[field]
                changed.append(field)
        if "draws" in entry:  # EZ2: fill missing hours only
            ex_draws = existing.setdefault("draws", {})
            for hour, pair in entry["draws"].items():
                if not ex_draws.get(hour):
                    ex_draws[hour] = pair
                    changed.append(hour)
        if changed:
            print(f"[repair] {game_key} {entry['date']}: filled {', '.join(changed)}")
            return "repair"
        return "skip"
    _insert_sorted(lst, entry)
    label = entry.get("nums") or entry.get("draws")
    print(f"[add] {game_key} {entry['date']}: {label}")
    return "add"


def check_gap(game_label, sched_key, history):
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


# ── main ─────────────────────────────────────────────────────────────────

def main():
    history = load_history()
    added = 0
    repaired = 0

    for game_key, url in GAME_PAGES.items():
        try:
            today_entry, table_entries = fetch_6ball_page(url)
        except Exception as e:
            print(f"[warn] failed to fetch {game_key}: {e}", file=sys.stderr)
            today_entry, table_entries = None, []

        merged_any = False
        for entry in ([today_entry] if today_entry else []) + table_entries:
            result = merge_entry(history, game_key, entry)
            if result == "add":
                added += 1
            elif result == "repair":
                repaired += 1
            merged_any = True
        if not merged_any:
            print(f"[warn] could not parse anything on {game_key} page")

        time.sleep(1)  # be polite between requests

    try:
        ez2_today, ez2_table = fetch_ez2_page(EZ2_PAGE)
    except Exception as e:
        ez2_today, ez2_table = None, []
        print(f"[warn] failed to fetch ez2: {e}", file=sys.stderr)

    for entry in ([ez2_today] if ez2_today else []) + ez2_table:
        result = merge_entry(history, "ez2", entry)
        if result == "add":
            added += 1
        elif result == "repair":
            repaired += 1

    # --- Gap-detection summary (additive, non-blocking) ---
    print("\n--- GAP CHECK ---")
    for sched_key in GAME_PAGES.keys():
        check_gap(sched_key, sched_key, history)
    check_gap("ez2", "ez2", history)
    print("--- END GAP CHECK ---\n")

    if added > 0 or repaired > 0:
        save_history(history)
        print(f"Done. Added {added} new entries, repaired {repaired} entries.")
    else:
        print("Done. No new entries or repairs (nothing to commit).")


if __name__ == "__main__":
    main()
