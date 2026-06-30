#!/usr/bin/env python3
"""
PCSO Results HISTORY Scraper v1
- Pulls the "Result History" table (last ~30 draws) from EZ2 + the 5 ball-game
  pages on businesslist.ph
- Merges new rows into pcso-history.json (overwrites same-date rows with the
  freshest scrape — useful when a "Winners" count updates after a draw)
- Trims anything older than HISTORY_DAYS so the file stays a rolling window
- Designed to run once a day (history tables only gain one new row at a time)
"""

import json, re, requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone, timedelta

PH_TZ = timezone(timedelta(hours=8))
HISTORY_DAYS = 90
OUTPUT_FILE = 'pcso-history.json'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.businesslist.ph/lottery',
}

EZ2_URL = 'https://www.businesslist.ph/lottery/result/ez2-lotto'

BALL_PAGES = {
    '6/58': ('https://www.businesslist.ph/lottery/result/ultra-lotto-658', 58),
    '6/55': ('https://www.businesslist.ph/lottery/result/grand-lotto-655', 55),
    '6/49': ('https://www.businesslist.ph/lottery/result/superlotto-649', 49),
    '6/45': ('https://www.businesslist.ph/lottery/result/megalotto-645', 45),
    '6/42': ('https://www.businesslist.ph/lottery/result/lotto-642', 42),
}


def fetch(url):
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    print(f"  {url.split('/')[-1]} → HTTP {r.status_code} | {len(r.text)} chars")
    return r.text


def parse_date(raw):
    """'Monday   29 Jun 2026' or 'Wednesday   June 24 2026' -> '2026-06-29'"""
    s = re.sub(r'^[A-Za-z]+\s+', '', raw.strip())
    s = re.sub(r'\s+', ' ', s).strip()
    for fmt in ('%d %b %Y', '%d %B %Y', '%B %d %Y', '%b %d %Y'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


def nums_in_range(txt, lo, hi):
    return [int(n) for n in re.findall(r'\b(\d{1,2})\b', txt) if lo <= int(n) <= hi]


def find_history_table(soup):
    """Find the heading containing 'Result History' and return the table right after it."""
    for h in soup.find_all(['h2', 'h3']):
        txt = h.get_text(strip=True)
        if 'Result History' in txt:
            table = h.find_next('table')
            if table:
                return table
    return None


def header_index(table):
    """Map lowercase header text -> column index, from the table's first row."""
    rows = table.find_all('tr')
    if not rows:
        return {}, []
    header_cells = rows[0].find_all(['th', 'td'])
    idx = {}
    for i, c in enumerate(header_cells):
        idx[c.get_text(strip=True).lower()] = i
    return idx, rows[1:]


def parse_ez2_history(html):
    soup = BeautifulSoup(html, 'html.parser')
    table = find_history_table(soup)
    entries = []
    if not table:
        print("  EZ2: history table not found")
        return entries

    idx, data_rows = header_index(table)
    d_i = idx.get('draw date')
    p2_i = idx.get('2pm')
    p5_i = idx.get('5pm')
    p9_i = idx.get('9pm')
    jp_i = idx.get('jackpot')
    w_i = idx.get('winners')

    for row in data_rows:
        cells = row.find_all('td')
        if not cells or d_i is None or d_i >= len(cells):
            continue
        date = parse_date(cells[d_i].get_text(' ', strip=True))
        if not date:
            continue

        draws = {}
        for label, ci in (('2PM', p2_i), ('5PM', p5_i), ('9PM', p9_i)):
            if ci is not None and ci < len(cells):
                nums = nums_in_range(cells[ci].get_text(' ', strip=True), 1, 31)
                draws[label] = nums if len(nums) == 2 else []
            else:
                draws[label] = []

        jackpot = cells[jp_i].get_text(strip=True) if jp_i is not None and jp_i < len(cells) else ''
        winners = cells[w_i].get_text(strip=True) if w_i is not None and w_i < len(cells) else ''

        entries.append({'date': date, 'draws': draws, 'jackpot': jackpot, 'winners': winners})

    return entries


def parse_ball_history(html, max_val):
    soup = BeautifulSoup(html, 'html.parser')
    table = find_history_table(soup)
    entries = []
    if not table:
        print("    history table not found")
        return entries

    idx, data_rows = header_index(table)
    d_i = idx.get('draw date')
    n_i = idx.get('winning numbers')
    jp_i = idx.get('jackpot')
    w_i = idx.get('winners')

    for row in data_rows:
        cells = row.find_all('td')
        if not cells or d_i is None or d_i >= len(cells):
            continue
        date = parse_date(cells[d_i].get_text(' ', strip=True))
        if not date:
            continue

        nums = []
        if n_i is not None and n_i < len(cells):
            nums = nums_in_range(cells[n_i].get_text(' ', strip=True), 1, max_val)
        if len(nums) != 6:
            continue

        jackpot = cells[jp_i].get_text(strip=True) if jp_i is not None and jp_i < len(cells) else ''
        winners = cells[w_i].get_text(strip=True) if w_i is not None and w_i < len(cells) else ''

        entries.append({'date': date, 'nums': nums, 'jackpot': jackpot, 'winners': winners})

    return entries


def merge_and_trim(existing, new_entries, today_ph):
    """New scrape overwrites same-date rows (fresher winners/jackpot). Trim to HISTORY_DAYS."""
    by_date = {e['date']: e for e in existing}
    for e in new_entries:
        by_date[e['date']] = e
    cutoff = (today_ph - timedelta(days=HISTORY_DAYS)).strftime('%Y-%m-%d')
    out = sorted(
        [e for e in by_date.values() if e['date'] >= cutoff],
        key=lambda e: e['date'],
        reverse=True,
    )
    return out


def load_existing():
    try:
        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO History Scraper v1 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print('=' * 50)

    existing = load_existing()
    output = {'updated': now_ph.isoformat()}

    # EZ2
    print("Fetching EZ2 history ...")
    try:
        html = fetch(EZ2_URL)
        new_ez2 = parse_ez2_history(html)
        print(f"  EZ2: {len(new_ez2)} rows scraped")
    except Exception as e:
        print(f"  EZ2 ERROR: {type(e).__name__}: {e}")
        new_ez2 = []
    output['ez2'] = merge_and_trim(existing.get('ez2', []), new_ez2, now_ph)

    # Ball games
    print("\nFetching ball-game histories ...")
    for game, (url, max_val) in BALL_PAGES.items():
        print(f"  {game}:")
        try:
            html = fetch(url)
            new_entries = parse_ball_history(html, max_val)
            print(f"    {len(new_entries)} rows scraped")
        except Exception as e:
            print(f"    ERROR: {type(e).__name__}: {e}")
            new_entries = []
        key = game  # '6/58', '6/55', etc.
        output[key] = merge_and_trim(existing.get(key, []), new_entries, now_ph)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {OUTPUT_FILE}")
    for k in ['ez2', '6/58', '6/55', '6/49', '6/45', '6/42']:
        print(f"  {k}: {len(output.get(k, []))} total entries on file")


if __name__ == '__main__':
    main()
