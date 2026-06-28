#!/usr/bin/env python3
"""
PCSO Results Scraper - uses lottopcso.com
Parses concatenated plain text format (no table pipes in GitHub Actions)
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

MONTHS = {
    'January':1,'February':2,'March':3,'April':4,'May':5,'June':6,
    'July':7,'August':8,'September':9,'October':10,'November':11,'December':12
}
ABBR = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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

    # === EZ2 ===
    # Text format: "2D LottoJune 28, 20262:00 PM24-045:00 PM19-259:00 PM17-13"
    ez2_m = re.search(r'2D Lotto.*?(?=STL|Ultra|Grand|Super|Mega|6/42|$)', text, re.DOTALL)
    if ez2_m:
        sec = ez2_m.group(0)
        for time_str, label in [('2:00 PM', '2PM'), ('5:00 PM', '5PM'), ('9:00 PM', '9PM')]:
            idx = sec.find(time_str)
            if idx >= 0:
                after = sec[idx + len(time_str):]
                m = re.match(r'(\d{2}-\d{2})', after)
                if m:
                    nums = [int(n) for n in m.group(1).split('-')]
                    if all(1 <= n <= 31 for n in nums):
                        result['ez2'][label] = nums

    # === 6-BALL GAMES ===
    game_patterns = [
        ('6/58', r'Ultra Lotto(June.*?)(?=\d/\d\d? |Grand|Super|Mega|4D|6D|$)'),
        ('6/55', r'Grand Lotto(June.*?)(?=\d/\d\d? |Super|Mega|4D|6D|$)'),
        ('6/49', r'Super Lotto(June.*?)(?=\d/\d\d? |Mega|4D|6D|$)'),
        ('6/45', r'Mega Lotto(June.*?)(?=\d/\d\d? |4D|6D|$)'),
        ('6/42', r'6/42 Lotto(June.*?)(?=4D|6D|STL|$)'),
    ]

    for game_key, pat in game_patterns:
        m = re.search(pat, text, re.DOTALL)
        if not m:
            continue
        sec = m.group(1)

        # Date
        dm = re.search(
            r'(January|February|March|April|May|June|July|August|'
            r'September|October|November|December)\s+(\d{1,2}),\s+(\d{4})', sec)
        date_label = 'Unknown'
        if dm:
            mon = MONTHS.get(dm.group(1), 0)
            if mon:
                date_label = ABBR[mon] + ' ' + str(int(dm.group(2)))

        # Winning combination - "Winning CombinationNN-NN-NN-NN-NN-NNJackpot"
        cm = re.search(r'Winning Combination([\d-]+)Jackpot', sec)
        if not cm:
            continue
        nums = [int(n) for n in cm.group(1).strip().split('-')]
        if len(nums) != 6:
            continue

        # Jackpot
        jackpot = ''
        jp = re.search(r'Jackpot Prize[\u20b1\u20a6P]?([\d,]+(?:\.\d+)?)', sec)
        if jp:
            try:
                val = float(jp.group(1).replace(',', ''))
                if val >= 1_000_000:
                    jackpot = f'\u20b1{val/1_000_000:.1f}M'
            except:
                pass

        # Winners
        winners = 0
        wm = re.search(r'Jackpot Winner \(6 out of 6\)(\d+)', sec)
        if wm:
            winners = int(wm.group(1))

        result['balls'][game_key] = {
            'nums': nums,
            'date': date_label,
            'jackpot': jackpot,
            'winners': winners
        }

    return result

def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print("=" * 50)

    html = fetch('https://www.lottopcso.com/')
    if not html:
        print("FAILED to fetch")
        return

    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text()

    parsed = parse_results(text)

    print("\nEZ2:")
    for draw in ['2PM', '5PM', '9PM']:
        nums = parsed['ez2'].get(draw, [])
        print(f"  {draw}: {nums if nums else 'not found'}")

    print("\n6-ball:")
    for game in ['6/58', '6/55', '6/49', '6/45', '6/42']:
        b = parsed['balls'].get(game)
        if b:
            print(f"  {game} ({b['date']}): {b['nums']} | {b['jackpot']} | {b['winners']}W")
        else:
            print(f"  {game}: not found")

    # Build output
    sched = {'6/58':[0,2,5],'6/55':[1,3,6],'6/49':[0,2,4],'6/45':[1,3,5],'6/42':[2,4,6]}
    cutoffs = {'2PM':14,'5PM':17,'9PM':21}

    ez2_data = [
        {'draw': draw, 'nums': parsed['ez2'].get(draw, []), 'cutoff': cutoffs[draw]}
        for draw in ['2PM', '5PM', '9PM']
    ]

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
