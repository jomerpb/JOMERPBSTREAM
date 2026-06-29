#!/usr/bin/env python3
"""
PCSO Results Scraper v18 — DEEP DIAGNOSTIC
Prints ALL sibling tags after each h2 to identify actual structure on GHA
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
BALL_658_URL     = 'https://www.businesslist.ph/lottery/result/ultra-lotto-658'

SCHED = {'6/58':[0,2,5],'6/55':[1,3,6],'6/49':[0,2,4],'6/45':[1,3,5],'6/42':[2,4,6]}


def fetch(url):
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    print(f"  HTTP {r.status_code} | {len(r.text)} chars")
    return r.text


def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper v18 DEEP DIAG — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print('=' * 50)

    # Only diagnose 6/58 page
    print(f"Fetching {BALL_658_URL} ...")
    try:
        html = fetch(BALL_658_URL)
        soup = BeautifulSoup(html, 'html.parser')

        # Find 'Today' h2
        today_h2 = None
        for h in soup.find_all('h2'):
            txt = h.get_text(strip=True)
            print(f"  h2: '{txt[:80]}'")
            if 'Today' in txt:
                today_h2 = h

        if today_h2:
            print(f"\nSiblings of '{today_h2.get_text(strip=True)}':")
            count = 0
            for sib in today_h2.next_siblings:
                if hasattr(sib, 'name') and sib.name == 'h2':
                    print(f"  -> STOP at next h2: '{sib.get_text(strip=True)[:60]}'")
                    break
                if hasattr(sib, 'name') and sib.name:
                    t = sib.get_text(strip=True)
                    if t:
                        print(f"  <{sib.name}> '{t[:100]}'")
                        count += 1
                        if count >= 20: break

    except Exception as e:
        print(f"ERROR: {e}")

    # Save empty JSON so workflow doesn't fail
    now_ph = datetime.now(PH_TZ)
    output = {
        'updated': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0',' '),
        'ez2': [{'draw':d,'nums':[],'cutoff':c} for d,c in [('2PM',14),('5PM',17),('9PM',21)]],
        'balls': [{'game':g,'nums':[],'done':False,'jackpot':'','draw_date':'','winners':0,'days':SCHED[g]}
                  for g in ['6/58','6/55','6/49','6/45','6/42']]
    }
    with open('pcso-results.json','w',encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print("\nSaved empty pcso-results.json (diagnostic run)")


if __name__ == '__main__':
    main()
