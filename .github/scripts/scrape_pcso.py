#!/usr/bin/env python3
"""PCSO Debug v2 - print exact chars around key terms"""

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
}

def main():
    now_ph = datetime.now(PH_TZ)
    print(f"PCSO Debug v2 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")

    r = requests.get('https://www.lottopcso.com/', headers=HEADERS, timeout=20)
    print(f"HTTP: {r.status_code}, Size: {len(r.text)} bytes")

    soup = BeautifulSoup(r.text, 'html.parser')
    text = soup.get_text()
    print(f"Text length: {len(text)}")

    # Print 200 chars around each key term
    for term in ['2D Lotto', 'EZ2', '2:00 PM', '24-04', 'Ultra Lotto',
                 'Winning Combination', '46-56', '6/58', '6/55']:
        idx = text.find(term)
        if idx >= 0:
            chunk = repr(text[max(0,idx-30):idx+80])
            print(f"[{term}] pos={idx}: {chunk}")
        else:
            print(f"[{term}] NOT FOUND")

    # Also print chars 800-1100 where we saw EZ2 data before
    print(f"\n--- chars 800-1200 ---")
    print(repr(text[800:1200]))
    print(f"\n--- chars 1050-1400 ---")
    print(repr(text[1050:1400]))

    # Save blank json
    output = {'updated':now_ph.isoformat(),'date':'June 28, 2026',
              'ez2':[{'draw':'2PM','nums':[],'cutoff':14},
                     {'draw':'5PM','nums':[],'cutoff':17},
                     {'draw':'9PM','nums':[],'cutoff':21}],
              'balls':[{'game':g,'date':'Unknown','nums':[],'done':False,
                        'jackpot':'','winners':0,'days':d}
                       for g,d in [('6/58',[0,2,5]),('6/55',[1,3,6]),
                                   ('6/49',[0,2,4]),('6/45',[1,3,5]),('6/42',[2,4,6])]]}
    with open('pcso-results.json','w') as f:
        json.dump(output,f,indent=2)
    print("Saved debug json")

if __name__ == '__main__':
    main()
