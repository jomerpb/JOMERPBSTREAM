#!/usr/bin/env python3
"""
PCSO Results Scraper v19
- Consolidated page: EZ2 today only + 6-ball nums (today/yesterday fallback)
- Individual game pages: jackpot + draw_date (handles div-based structure on GHA)
- Numbers in div as concatenated pairs: '4656080103 05NUMERICAL ORDER' -> [46,56,8,1,3,5]
"""

import json, re, requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone, timedelta

PH_TZ = timezone(timedelta(hours=8))

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.businesslist.ph/lottery',
}

CONSOLIDATED_URL = 'https://www.businesslist.ph/lottery/pcso-lotto-results-today'

BALL_PAGES = {
    '6/58': ('https://www.businesslist.ph/lottery/result/ultra-lotto-658', 58),
    '6/55': ('https://www.businesslist.ph/lottery/result/grand-lotto-655', 55),
    '6/49': ('https://www.businesslist.ph/lottery/result/superlotto-649', 49),
    '6/45': ('https://www.businesslist.ph/lottery/result/megalotto-645', 45),
    '6/42': ('https://www.businesslist.ph/lottery/result/lotto-642', 42),
}

SCHED = {
    '6/58': [0, 2, 5],
    '6/55': [1, 3, 6],
    '6/49': [0, 2, 4],
    '6/45': [1, 3, 5],
    '6/42': [2, 4, 6],
}


def fetch(url):
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    print(f"  {url.split('/')[-1]} → HTTP {r.status_code} | {len(r.text)} chars")
    return r.text


def format_jackpot(raw):
    try:
        v = float(raw.replace(',', '').strip())
        return f'₱{v/1_000_000:.1f}M' if v >= 1_000_000 else f'₱{v:,.0f}'
    except:
        return raw


def extract_ball_nums(text, max_val):
    """Split concatenated number string into 2-digit pairs.
    e.g. '4656080103 05NUMERICAL ORDER' → [46,56,8,1,3,5]
    """
    digits_only = re.sub(r'\D', '', text)
    if len(digits_only) == 12:
        pairs = [int(digits_only[i:i+2]) for i in range(0, 12, 2)]
        if all(1 <= n <= max_val for n in pairs):
            return pairs
    return []


def parse_ez2_cell(text):
    """EZ2 cell: '2PM   21   24      5PM   27   30      9PM   ?   ?'"""
    ez2 = {'2PM': [], '5PM': [], '9PM': []}
    parts = re.split(r'\b(2PM|5PM|9PM)\b', text)
    current = None
    for part in parts:
        part = part.strip()
        if part in ('2PM', '5PM', '9PM'):
            current = part
        elif current:
            nums = [int(n) for n in re.findall(r'\b(\d{1,2})\b', part)
                    if 1 <= int(n) <= 31]
            if len(nums) == 2:
                ez2[current] = nums
            current = None
    return ez2


def parse_consolidated(html):
    """Parse consolidated page — EZ2 today only, 6-ball nums today+yesterday."""
    soup = BeautifulSoup(html, 'html.parser')
    MAX_VAL = {'6/58': 58, '6/55': 55, '6/49': 49, '6/45': 45, '6/42': 42}
    ez2_today = {'2PM': [], '5PM': [], '9PM': []}
    balls_today, balls_yest = {}, {}
    current_section = None

    for tag in soup.find_all(['h2', 'table']):
        if tag.name == 'h2':
            txt = tag.get_text(strip=True)
            if 'Today' in txt:       current_section = 'today'
            elif 'Yesterday' in txt: current_section = 'yesterday'
            else:                    current_section = None

        elif tag.name == 'table' and current_section in ('today', 'yesterday'):
            for row in tag.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) < 3: continue
                gc = cells[1].get_text(strip=True)
                nc = cells[2].get_text(separator=' ', strip=True)

                if '2D' in gc:
                    if current_section == 'today':
                        ez2_today = parse_ez2_cell(nc)
                else:
                    for g, mx in MAX_VAL.items():
                        if g in gc:
                            text = re.sub(r'\b(2PM|5PM|9PM)\b', '', nc)
                            nums = [int(n) for n in re.findall(r'\b(\d{1,2})\b', text)
                                    if 1 <= int(n) <= mx]
                            if len(nums) == 6:
                                if current_section == 'today' and g not in balls_today:
                                    balls_today[g] = nums
                                elif current_section == 'yesterday' and g not in balls_yest:
                                    balls_yest[g] = nums

    return ez2_today, balls_today, balls_yest


def parse_individual(html, max_val):
    """Get nums + jackpot + draw_date from individual game page.
    Handles GHA div structure: numbers are concatenated in a single div.
    Today first, yesterday fallback.
    """
    soup = BeautifulSoup(html, 'html.parser')

    for section in ['Today', 'Yesterday']:
        h2 = None
        for h in soup.find_all('h2'):
            if section in h.get_text(strip=True):
                h2 = h
                break
        if not h2:
            continue

        nums, jackpot, draw_date = [], '', ''

        for sib in h2.next_siblings:
            if hasattr(sib, 'name') and sib.name == 'h2':
                break
            if not hasattr(sib, 'name') or not sib.name:
                continue
            t = sib.get_text(strip=True)
            if not t:
                continue

            # Date: 'Sunday | June 28, 2026'
            m_dt = re.search(r'(\w+\s+\d+,\s*\d{4})', t)
            if m_dt:
                draw_date = m_dt.group(1)
                continue

            # Jackpot: 'JACKPOT:128,000,000'
            m_jp = re.search(r'JACKPOT[:\s]*([0-9,]+)', t, re.I)
            if m_jp:
                jackpot = format_jackpot(m_jp.group(1))
                continue

            # Numbers — concatenated 2-digit pairs in a div
            if not nums:
                nums = extract_ball_nums(t, max_val)

        if len(nums) == 6:
            return {'nums': nums, 'jackpot': jackpot, 'draw_date': draw_date}

    return {'nums': [], 'jackpot': '', 'draw_date': ''}


def build_output(ez2_map, balls_map):
    now_ph = datetime.now(PH_TZ)
    return {
        'updated': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0', ' '),
        'ez2': [
            {'draw': d, 'nums': ez2_map.get(d, []), 'cutoff': c}
            for d, c in [('2PM', 14), ('5PM', 17), ('9PM', 21)]
        ],
        'balls': [
            {
                'game':      gk,
                'nums':      balls_map[gk]['nums'],
                'done':      len(balls_map[gk]['nums']) == 6,
                'jackpot':   balls_map[gk]['jackpot'],
                'draw_date': balls_map[gk]['draw_date'],
                'winners':   0,
                'days':      SCHED[gk],
            }
            for gk in ['6/58', '6/55', '6/49', '6/45', '6/42']
        ],
    }


def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper v19 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print('=' * 50)

    ez2_map   = {'2PM': [], '5PM': [], '9PM': []}
    balls_map = {g: {'nums': [], 'jackpot': '', 'draw_date': ''} for g in BALL_PAGES}

    # Step 1 — Consolidated page
    try:
        print("Fetching consolidated page ...")
        html = fetch(CONSOLIDATED_URL)
        ez2_map, balls_today, balls_yest = parse_consolidated(html)
        ez2_found = sum(1 for v in ez2_map.values() if v)
        print(f"  EZ2: {ez2_map}")
        print(f"  Balls today: {list(balls_today.keys())} | Yesterday: {list(balls_yest.keys())}")
    except Exception as e:
        print(f"  Consolidated ERROR: {type(e).__name__}: {e}")
        balls_today, balls_yest = {}, {}

    # Step 2 — Individual pages (jackpot + draw_date + confirm nums)
    print("\nFetching individual game pages ...")
    for game, (url, max_val) in BALL_PAGES.items():
        try:
            html = fetch(url)
            info = parse_individual(html, max_val)

            if info['nums']:
                balls_map[game] = info
            else:
                # Fallback to consolidated nums if individual page has no draw
                nums = balls_today.get(game) or balls_yest.get(game) or []
                balls_map[game] = {'nums': nums, 'jackpot': '', 'draw_date': ''}

            if balls_map[game]['nums']:
                print(f"  {game}: {balls_map[game]['nums']} | {balls_map[game]['jackpot']} | {balls_map[game]['draw_date']}")
            else:
                print(f"  {game}: no draw today or pending")

        except Exception as e:
            print(f"  {game} ERROR: {type(e).__name__}: {e}")
            nums = balls_today.get(game) or balls_yest.get(game) or []
            balls_map[game] = {'nums': nums, 'jackpot': '', 'draw_date': ''}

    output = build_output(ez2_map, balls_map)

    with open('pcso-results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    ez2_found   = sum(1 for e in output['ez2'] if e['nums'])
    balls_found = sum(1 for b in output['balls'] if b['nums'])
    print(f"\nSaved pcso-results.json | EZ2: {ez2_found}/3 | Balls: {balls_found}/5")


if __name__ == '__main__':
    main()
