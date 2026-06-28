#!/usr/bin/env python3
"""
PCSO Results Scraper v4 - Individual game pages from lottopcso.com
Uses permanent per-game URLs that always show latest results in markdown tables
Works 24/7 regardless of time of day
"""

import requests, json, re, time
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
        soup = BeautifulSoup(r.text, 'html.parser')
        return soup.get_text()
    except Exception as e:
        print(f"  ERROR {url}: {e}")
        return None

def parse_ez2(text):
    ez2 = {}
    for m in re.finditer(r'\|\s*\*?\*?(\d{1,2}:\d{2}\s*[AP]M)\*?\*?\s*\|\s*([\d-]+)\s*\|', text):
        time_str = m.group(1).strip()
        nums_str = m.group(2).strip()
        hm = re.match(r'(\d{1,2}):(\d{2})\s*([AP]M)', time_str)
        if hm and '-' in nums_str:
            h = int(hm.group(1)); ampm = hm.group(3)
            hour = h + (12 if ampm == 'PM' and h != 12 else 0)
            draw = {14: '2PM', 17: '5PM', 21: '9PM'}.get(hour)
            if draw:
                parts = [int(n) for n in nums_str.split('-')]
                if len(parts) == 2 and all(1 <= n <= 31 for n in parts):
                    ez2[draw] = parts
    return ez2

def parse_ball(text, anchor):
    start = text.find(anchor)
    if start < 0:
        return None
    sec = text[start:start+600]
    dm = re.search(
        r'(January|February|March|April|May|June|July|August|'
        r'September|October|November|December)\s+(\d{1,2}),\s+(\d{4})', sec)
    dl = 'Unknown'
    if dm:
        mon = MONTHS.get(dm.group(1), 0)
        if mon:
            dl = ABBR[mon] + ' ' + str(int(dm.group(2)))
    cm = re.search(r'Winning Combination\s*\|\s*((?:\d{1,2}-){5}\d{1,2})\s*\|', sec)
    if not cm:
        return None
    nums = [int(n) for n in cm.group(1).strip().split('-')]
    if len(nums) != 6:
        return None
    jp = ''
    jm = re.search(r'Jackpot Prize\s*\|\s*[\u20b1]?([\d,]+(?:\.\d+)?)\s*\|', sec)
    if jm:
        try:
            v = float(jm.group(1).replace(',', ''))
            if v >= 1_000_000:
                jp = f'\u20b1{v/1_000_000:.1f}M'
        except:
            pass
    wm = re.search(r'Jackpot Winner \(6 out of 6\)\s*\|\s*(\d+)\s*\|', sec)
    winners = int(wm.group(1)) if wm else 0
    return {'nums': nums, 'date': dl, 'jackpot': jp, 'winners': winners}

def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper v4 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print("=" * 50)

    # EZ2 - dedicated page
    print("\n[EZ2]")
    ez2_text = fetch('https://www.lottopcso.com/ez2-result-today-lotto-history-and-summary/')
    ez2 = parse_ez2(ez2_text) if ez2_text else {}
    for draw in ['2PM', '5PM', '9PM']:
        print(f"  {draw}: {ez2.get(draw, 'not found')}")

    time.sleep(1)

    # 6-ball games - individual pages
    games = [
        ('6/58', 'https://www.lottopcso.com/6-58-lotto-result/', '6/58 Ultra Lotto', [0,2,5]),
        ('6/55', 'https://www.lottopcso.com/6-55-lotto-result/', '6/55 Grand Lotto', [1,3,6]),
        ('6/49', 'https://www.lottopcso.com/6-49-lotto-result/', '6/49 Super Lotto', [0,2,4]),
        ('6/45', 'https://www.lottopcso.com/6-45-lotto-result/', '6/45 Mega Lotto',  [1,3,5]),
        ('6/42', 'https://www.lottopcso.com/6-42-lotto-result/', '6/42 Lotto',       [2,4,6]),
    ]

    print("\n[6-ball]")
    ball_results = {}
    for gk, url, anchor, days in games:
        text = fetch(url)
        result = parse_ball(text, anchor) if text else None
        if result:
            ball_results[gk] = result
            print(f"  {gk} ({result['date']}): {result['nums']} | {result['jackpot']} | {result['winners']}W")
        else:
            print(f"  {gk}: not found")
        time.sleep(0.5)

    # Build output JSON
    sched = {'6/58':[0,2,5],'6/55':[1,3,6],'6/49':[0,2,4],'6/45':[1,3,5],'6/42':[2,4,6]}
    output = {
        'updated': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0', ' '),
        'ez2': [
            {'draw': d, 'nums': ez2.get(d, []), 'cutoff': c}
            for d, c in [('2PM',14), ('5PM',17), ('9PM',21)]
        ],
        'balls': [
            {
                'game': gk,
                'date': ball_results.get(gk, {}).get('date', 'Unknown'),
                'nums': ball_results.get(gk, {}).get('nums', []),
                'done': len(ball_results.get(gk, {}).get('nums', [])) == 6,
                'jackpot': ball_results.get(gk, {}).get('jackpot', ''),
                'winners': ball_results.get(gk, {}).get('winners', 0),
                'days': sched[gk]
            }
            for gk, url, anchor, days in games
        ]
    }

    with open('pcso-results.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    ez2_found = sum(1 for e in output['ez2'] if e['nums'])
    balls_found = sum(1 for b in output['balls'] if b['nums'])
    print(f"\n{'='*50}")
    print(f"Saved pcso-results.json")
    print(f"EZ2: {ez2_found}/3 | Balls: {balls_found}/5")

if __name__ == '__main__':
    main()
