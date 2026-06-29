#!/usr/bin/env python3
"""
PCSO Results Scraper v17
Source: businesslist.ph/lottery/pcso-lotto-results-today (single page, all games)
Strategy: today's results first, yesterday's as fallback for undrawn games
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

URL = 'https://www.businesslist.ph/lottery/pcso-lotto-results-today'

SCHED = {
    '6/58': [0, 2, 5],
    '6/55': [1, 3, 6],
    '6/49': [0, 2, 4],
    '6/45': [1, 3, 5],
    '6/42': [2, 4, 6],
}

MAX_VAL = {
    '6/58': 58, '6/55': 55, '6/49': 49, '6/45': 45, '6/42': 42,
}


def parse_ez2_cell(text):
    """Extract 2PM/5PM/9PM pairs from a cell like '2PM   21   24      5PM   ?   ?'"""
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


def parse_ball_cell(text, max_val):
    """Extract 6 numbers from a cell like '46   56   08   01   03   05'"""
    text = re.sub(r'\b(2PM|5PM|9PM|10:30|3PM|7PM)\b', '', text)
    nums = re.findall(r'\b(\d{1,2})\b', text)
    result = [int(n) for n in nums if 1 <= int(n) <= max_val]
    return result[:6] if len(result) >= 6 else []


def parse_page(html):
    soup = BeautifulSoup(html, 'html.parser')

    results = {
        'today':     {'ez2': {'2PM': [], '5PM': [], '9PM': []}, 'balls': {}},
        'yesterday': {'ez2': {'2PM': [], '5PM': [], '9PM': []}, 'balls': {}},
    }

    current_section = None

    for tag in soup.find_all(['h2', 'table']):
        if tag.name == 'h2':
            txt = tag.get_text(strip=True)
            if 'Today' in txt:
                current_section = 'today'
            elif 'Yesterday' in txt:
                current_section = 'yesterday'
            else:
                current_section = None

        elif tag.name == 'table' and current_section in ('today', 'yesterday'):
            for row in tag.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) < 3:
                    continue
                game_cell = cells[1].get_text(strip=True)
                nums_cell = cells[2].get_text(separator=' ', strip=True)

                # Skip rows with no digits (all ?)
                if not re.search(r'\d', nums_cell):
                    continue

                if '2D' in game_cell:
                    ez2 = parse_ez2_cell(nums_cell)
                    for d in ['2PM', '5PM', '9PM']:
                        if ez2[d]:
                            results[current_section]['ez2'][d] = ez2[d]

                else:
                    for game, mx in MAX_VAL.items():
                        if game in game_cell and game not in results[current_section]['balls']:
                            nums = parse_ball_cell(nums_cell, mx)
                            if len(nums) == 6:
                                results[current_section]['balls'][game] = nums

    return results


def merge(results):
    """Use today's results where available; fall back to yesterday for undrawn games."""
    ez2 = {'2PM': [], '5PM': [], '9PM': []}
    balls = {}

    for d in ['2PM', '5PM', '9PM']:
        ez2[d] = results['today']['ez2'][d] or results['yesterday']['ez2'][d]

    for g in ['6/58', '6/55', '6/49', '6/45', '6/42']:
        balls[g] = (results['today']['balls'].get(g)
                    or results['yesterday']['balls'].get(g)
                    or [])

    return ez2, balls


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
    print(f"\nPCSO Scraper v17 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print('=' * 50)
    print(f"Fetching {URL} ...")

    ez2_map   = {'2PM': [], '5PM': [], '9PM': []}
    balls_map = {}

    try:
        r = requests.get(URL, headers=HEADERS, timeout=20)
        r.raise_for_status()
        print(f"HTTP {r.status_code} | {len(r.text)} chars")

        results = parse_page(r.text)
        ez2_map, balls_map = merge(results)

        print(f"Today   — EZ2: {results['today']['ez2']} | Balls: {list(results['today']['balls'].keys())}")
        print(f"Yesterday — EZ2: {results['yesterday']['ez2']} | Balls: {list(results['yesterday']['balls'].keys())}")
        print(f"Merged  — EZ2: {ez2_map}")
        for g, nums in balls_map.items():
            if nums:
                print(f"  {g}: {nums}")

    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")

    output = build_output(ez2_map, balls_map)

    with open('pcso-results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    ez2_found   = sum(1 for e in output['ez2'] if e['nums'])
    balls_found = sum(1 for b in output['balls'] if b['nums'])
    print(f"\nSaved pcso-results.json | EZ2: {ez2_found}/3 | Balls: {balls_found}/5")


if __name__ == '__main__':
    main()
