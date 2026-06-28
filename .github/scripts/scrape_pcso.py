#!/usr/bin/env python3
"""PCSO Debug v3 - print raw HTML to find actual data structure"""

import requests, json, re
from datetime import datetime, timezone, timedelta

PH_TZ = timezone(timedelta(hours=8))
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

def main():
    now_ph = datetime.now(PH_TZ)
    print(f"PCSO Debug v3 — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")

    r = requests.get('https://www.lottopcso.com/ez2-result-today-lotto-history-and-summary/',
                     headers=HEADERS, timeout=20)
    print(f"HTTP: {r.status_code}, Size: {len(r.text)} bytes")

    html = r.text

    # Search for key data in raw HTML
    for term in ['24-04', '19-25', '17-13', '2:00 PM', '9:00 PM',
                 'Winning Combination', 'table', '<td', 'application/ld+json',
                 'EZ2', '2D Lotto']:
        idx = html.find(term)
        if idx >= 0:
            print(f"[{term}] pos={idx}: {repr(html[max(0,idx-30):idx+60])}")
        else:
            print(f"[{term}] NOT FOUND in raw HTML")

    # Print raw HTML chars 0-500 to see page structure
    print(f"\n--- RAW HTML first 500 chars ---")
    print(repr(html[:500]))

    # Print around position 1000-2000 where content might be
    print(f"\n--- RAW HTML chars 1000-2000 ---")
    print(repr(html[1000:2000]))

    # Save blank
    output = {'updated':now_ph.isoformat(),'date':'June 29, 2026',
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
