#!/usr/bin/env python3
"""
PCSO Results Scraper - lottopcso.com
Parses concatenated plain text (actual format received by GitHub Actions)
"""

import requests, json, re
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

def parse(text):
    result = {'ez2':{}, 'balls':{}}

    # EZ2: section between "2D Lotto" and "STL"
    ez2_m = re.search(r'2D Lotto(.*?)STL', text, re.DOTALL)
    if ez2_m:
        sec = ez2_m.group(1)
        for ts, lbl in [('2:00 PM','2PM'), ('5:00 PM','5PM'), ('9:00 PM','9PM')]:
            idx = sec.find(ts)
            if idx >= 0:
                m = re.match(r'(\d{2}-\d{2})', sec[idx+len(ts):])
                if m:
                    nums = [int(n) for n in m.group(1).split('-')]
                    if all(1 <= n <= 31 for n in nums):
                        result['ez2'][lbl] = nums

    # 6-ball: anchored by exact game label
    anchors = [
        ('6/58', '6/58 Ultra Lotto'),
        ('6/55', '6/55 Grand Lotto'),
        ('6/49', '6/49 Super Lotto'),
        ('6/45', '6/45 Mega Lotto'),
        ('6/42', '6/42 Lotto'),
    ]
    for i, (gk, anchor) in enumerate(anchors):
        start = text.find(anchor)
        if start < 0:
            continue
        # Bound section by next anchor or end markers
        end = len(text)
        for j in range(i+1, len(anchors)):
            np = text.find(anchors[j][1], start+1)
            if np > start:
                end = min(end, np)
                break
        for term in ['4D Lotto', '6D Lotto']:
            p = text.find(term, start+1)
            if p > start:
                end = min(end, p)
        sec = text[start:end]

        # Date
        dm = re.search(
            r'(January|February|March|April|May|June|July|August|'
            r'September|October|November|December)\s+(\d{1,2}),\s+(\d{4})', sec)
        dl = 'Unknown'
        if dm:
            mon = MONTHS.get(dm.group(1), 0)
            if mon:
                dl = ABBR[mon] + ' ' + str(int(dm.group(2)))

        # Winning combination
        cm = re.search(r'Winning Combination((?:\d{1,2}-){5}\d{1,2})', sec)
        if not cm:
            continue
        nums = [int(n) for n in cm.group(1).split('-')]
        if len(nums) != 6:
            continue

        # Jackpot
        jp = ''
        jm = re.search(r'Jackpot Prize[\u20b1\u20a6]?([\d,]+(?:\.\d+)?)', sec)
        if jm:
            try:
                v = float(jm.group(1).replace(',', ''))
                if v >= 1_000_000:
                    jp = f'\u20b1{v/1_000_000:.1f}M'
            except:
                pass

        # Winners
        wm = re.search(r'Jackpot Winner \(6 out of 6\)(\d+)', sec)
        winners = int(wm.group(1)) if wm else 0

        result['balls'][gk] = {
            'nums': nums, 'date': dl, 'jackpot': jp, 'winners': winners
        }

    return result

def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print("=" * 50)

    try:
        r = requests.get('https://www.lottopcso.com/', headers=HEADERS, timeout=20)
        r.raise_for_status()
    except Exception as e:
        print(f"FAILED: {e}")
        return

    soup = BeautifulSoup(r.text, 'html.parser')
    text = soup.get_text()
    print(f"Page fetched: {len(text)} chars")

    parsed = parse(text)

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

    # Build output JSON
    sched = {'6/58':[0,2,5],'6/55':[1,3,6],'6/49':[0,2,4],'6/45':[1,3,5],'6/42':[2,4,6]}
    output = {
        'updated': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0', ' '),
        'ez2': [
            {'draw': d, 'nums': parsed['ez2'].get(d, []), 'cutoff': c}
            for d, c in [('2PM',14), ('5PM',17), ('9PM',21)]
        ],
        'balls': [
            {
                'game': g,
                'date': parsed['balls'].get(g,{}).get('date','Unknown'),
                'nums': parsed['balls'].get(g,{}).get('nums',[]),
                'done': len(parsed['balls'].get(g,{}).get('nums',[]))==6,
                'jackpot': parsed['balls'].get(g,{}).get('jackpot',''),
                'winners': parsed['balls'].get(g,{}).get('winners',0),
                'days': sched[g]
            }
            for g in ['6/58','6/55','6/49','6/45','6/42']
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
