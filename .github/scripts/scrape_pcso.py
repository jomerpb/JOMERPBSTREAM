#!/usr/bin/env python3
"""
PCSO Results Scraper v16
Source: businesslist.ph (separate pages per game)
Parser: h2 sibling traversal — no get_text() table merging issue
No 'date' field in balls output entries
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

SCHED = {
    '6/58': [0, 2, 5],
    '6/55': [1, 3, 6],
    '6/49': [0, 2, 4],
    '6/45': [1, 3, 5],
    '6/42': [2, 4, 6],
}

BALL_URLS = {
    '6/58': ('https://www.businesslist.ph/lottery/result/ultra-lotto-658', 58),
    '6/55': ('https://www.businesslist.ph/lottery/result/grand-lotto-655', 55),
    '6/49': ('https://www.businesslist.ph/lottery/result/superlotto-649', 49),
    '6/45': ('https://www.businesslist.ph/lottery/result/megalotto-645', 45),
    '6/42': ('https://www.businesslist.ph/lottery/result/lotto-642', 42),
}

EZ2_URL = 'https://www.businesslist.ph/lottery/result/ez2-lotto'


def fetch(url):
    print(f"  Fetching {url} ...")
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    print(f"  HTTP {r.status_code} | {len(r.text)} chars")
    return r.text


def parse_ez2(html):
    """Parse EZ2 using h2 sibling traversal — avoids table merging."""
    soup = BeautifulSoup(html, 'html.parser')
    ez2 = {'2PM': [], '5PM': [], '9PM': []}

    # Find the Today h2
    today_h2 = None
    for h in soup.find_all('h2'):
        txt = h.get_text(strip=True)
        if 'Today' in txt and 'EZ2' in txt:
            today_h2 = h
            break

    if not today_h2:
        print("  EZ2: 'Today' heading not found")
        return ez2

    current_draw = None
    nums_buf = []

    for sib in today_h2.next_siblings:
        if sib.name == 'h2':
            break
        if sib.name == 'p':
            t = sib.get_text(strip=True)
            if t in ('2PM', '5PM', '9PM'):
                if current_draw and len(nums_buf) == 2:
                    ez2[current_draw] = nums_buf
                current_draw = t
                nums_buf = []
            elif current_draw and re.match(r'^\d{1,2}$', t):
                n = int(t)
                if 1 <= n <= 31:
                    nums_buf.append(n)

    if current_draw and len(nums_buf) == 2:
        ez2[current_draw] = nums_buf

    return ez2


def parse_ball(html, max_val):
    """Parse 6-ball using h2 sibling traversal."""
    soup = BeautifulSoup(html, 'html.parser')

    today_h2 = None
    for h in soup.find_all('h2'):
        if 'Result Today' in h.get_text(strip=True):
            today_h2 = h
            break

    if not today_h2:
        return []

    nums = []

    for sib in today_h2.next_siblings:
        if sib.name == 'h2':
            break
        if sib.name == 'p':
            t = sib.get_text(strip=True)
            if re.match(r'^\d{1,2}$', t):
                n = int(t)
                if 1 <= n <= max_val:
                    nums.append(n)
                if len(nums) == 6:
                    break

    return nums if len(nums) == 6 else []


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
                'game': gk,
                'nums': balls_map.get(gk, []),
                'done': len(balls_map.get(gk, [])) == 6,
                'jackpot': '',
                'winners': 0,
                'days': SCHED[gk],
            }
            for gk in ['6/58', '6/55', '6/49', '6/45', '6/42']
        ],
    }


def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper v16 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print('=' * 50)

    ez2_map   = {'2PM': [], '5PM': [], '9PM': []}
    balls_map = {}

    # EZ2
    try:
        html = fetch(EZ2_URL)
        ez2_map = parse_ez2(html)
        ez2_found = sum(1 for v in ez2_map.values() if v)
        print(f"  EZ2: {ez2_found}/3 → {ez2_map}")
    except Exception as e:
        print(f"  EZ2 ERROR: {type(e).__name__}: {e}")

    # 6-ball games
    for game, (url, max_val) in BALL_URLS.items():
        try:
            html = fetch(url)
            nums = parse_ball(html, max_val)
            if nums:
                balls_map[game] = nums
                print(f"  {game}: {nums}")
            else:
                print(f"  {game}: no draw today or pending")
        except Exception as e:
            print(f"  {game} ERROR: {type(e).__name__}: {e}")

    output = build_output(ez2_map, balls_map)

    with open('pcso-results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    ez2_found   = sum(1 for e in output['ez2'] if e['nums'])
    balls_found = sum(1 for b in output['balls'] if b['nums'])
    print(f"\nSaved pcso-results.json | EZ2: {ez2_found}/3 | Balls: {balls_found}/5")


if __name__ == '__main__':
    main()
