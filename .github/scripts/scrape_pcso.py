#!/usr/bin/env python3
"""
PCSO Results Scraper - uses lottopcso.com
Fetches latest results and saves to pcso-results.json
Runs via GitHub Actions 3x daily
"""

import requests
import json
import re
from datetime import datetime, timezone, timedelta
from bs4 import BeautifulSoup

PH_TZ = timezone(timedelta(hours=8))

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
}

def fetch(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"  ERROR: {url} -> {e}")
        return None

def parse_results(text):
    result = {'ez2': {}, 'balls': {}}

    # EZ2: matches "| 2:00 PM  | 24-04  |"
    for m in re.finditer(r'\|\s*(\d{1,2}):00\s*(PM|AM)\s*\|\s*([\d-]+)\s*\|', text):
        h = int(m.group(1))
        ampm = m.group(2)
        nums_str = m.group(3).strip()
        hour = h + (12 if ampm == 'PM' and h != 12 else 0)
        draw = {14: '2PM', 17: '5PM', 21: '9PM'}.get(hour)
        if draw and '-' in nums_str:
            parts = [int(n) for n in nums_str.split('-')]
            if len(parts) == 2 and all(1 <= n <= 31 for n in parts):
                result['ez2'][draw] = parts

    # 6-ball games: find each game section then parse combination
    game_labels = {
        '6/58': r'6/58 Ultra Lotto',
        '6/55': r'6/55 Grand Lotto',
        '6/49': r'6/49 Super Lotto',
        '6/45': r'6/45 Mega Lotto',
        '6/42': r'6/42 Lotto\b',
    }

    month_map = {
        'January':1,'February':2,'March':3,'April':4,'May':5,'June':6,
        'July':7,'August':8,'September':9,'October':10,'November':11,'December':12
    }
    month_abbr = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

    for game_key, label_pat in game_labels.items():
        label_m = re.search(label_pat, text)
        if not label_m:
            continue

        pos = label_m.start()
        section = text[pos:pos+500]

        # Date from header row
        date_m = re.search(r'(\w+)\s+(\d{1,2}),\s+(\d{4})', section)
        date_label = 'Unknown'
        if date_m:
            mon_name = date_m.group(1)
            day = int(date_m.group(2))
            mon_num = month_map.get(mon_name, 0)
            if mon_num:
                date_label = f"{month_abbr[mon_num]} {day}"

        # Winning combination
        comb_m = re.search(r'Winning Combination\s*\|\s*([\d-]+)\s*\|', section)
        if not comb_m:
            continue
        nums = [int(n) for n in comb_m.group(1).strip().split('-')]
        if len(nums) != 6:
            continue

        # Jackpot
        jackpot = ''
        jp_m = re.search(r'Jackpot Prize\s*\|\s*[\u20b1]?([\d,]+(?:\.\d+)?)', section)
        if jp_m:
            try:
                jp_val = float(jp_m.group(1).replace(',', ''))
                if jp_val >= 1_000_000:
                    jackpot = f'\u20b1{jp_val/1_000_000:.1f}M'
            except:
                pass

        # Winners
        winners = 0
        win_m = re.search(r'Jackpot Winner.*?\|\s*(\d+)\s*\|', section)
        if win_m:
            winners = int(win_m.group(1))

        result['balls'][game_key] = {
            'nums': nums,
            'date': date_label,
            'jackpot': jackpot,
            'winners': winners
        }

    return result

def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper (lottopcso.com) — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print("=" * 50)

    # Fetch main results page
    url = 'https://www.lottopcso.com/'
    print(f"Fetching: {url}")
    html = fetch(url)

    if not html:
        print("FAILED to fetch main page")
        return

    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text()

    parsed = parse_results(text)

    # Print what we found
    print(f"\nEZ2 results:")
    for draw in ['2PM', '5PM', '9PM']:
        nums = parsed['ez2'].get(draw, [])
        print(f"  {draw}: {nums if nums else 'not found'}")

    print(f"\n6-ball results:")
    for game in ['6/58', '6/55', '6/49', '6/45', '6/42']:
        b = parsed['balls'].get(game, {})
        if b:
            print(f"  {game} ({b['date']}): {b['nums']} | {b['jackpot']} | {b['winners']} winners")
        else:
            print(f"  {game}: not found")

    # Build output
    sched = {'6/58':[0,2,5],'6/55':[1,3,6],'6/49':[0,2,4],'6/45':[1,3,5],'6/42':[2,4,6]}
    cutoffs = {'2PM':14,'5PM':17,'9PM':21}

    ez2_data = []
    for draw in ['2PM', '5PM', '9PM']:
        nums = parsed['ez2'].get(draw, [])
        ez2_data.append({'draw': draw, 'nums': nums, 'cutoff': cutoffs[draw]})

    balls_data = []
    for game_key in ['6/58', '6/55', '6/49', '6/45', '6/42']:
        b = parsed['balls'].get(game_key, {})
        balls_data.append({
            'game': game_key,
            'date': b.get('date', 'Unknown'),
            'nums': b.get('nums', []),
            'done': len(b.get('nums', [])) == 6,
            'jackpot': b.get('jackpot', ''),
            'winners': b.get('winners', 0),
            'days': sched[game_key]
        })

    output = {
        'updated': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0', ' '),
        'ez2': ez2_data,
        'balls': balls_data
    }

    with open('pcso-results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    ez2_found = sum(1 for e in ez2_data if e['nums'])
    balls_found = sum(1 for b in balls_data if b['nums'])
    print(f"\n{'='*50}")
    print(f"Saved pcso-results.json")
    print(f"EZ2: {ez2_found}/3 | Balls: {balls_found}/5")

if __name__ == '__main__':
    main()
