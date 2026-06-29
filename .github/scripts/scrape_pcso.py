#!/usr/bin/env python3
"""
PCSO Results Scraper v17 — DIAGNOSTIC
Prints all headings + first sibling content to identify exact page structure
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
    '6/58': [0,2,5], '6/55': [1,3,6], '6/49': [0,2,4],
    '6/45': [1,3,5], '6/42': [2,4,6],
}

EZ2_URL  = 'https://www.businesslist.ph/lottery/result/ez2-lotto'
BALL_658 = 'https://www.businesslist.ph/lottery/result/ultra-lotto-658'


def fetch(url):
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    print(f"  HTTP {r.status_code} | {len(r.text)} chars")
    return r.text


def diagnose(html, label):
    """Print every heading + its first 5 sibling <p> texts."""
    soup = BeautifulSoup(html, 'html.parser')
    print(f"\n--- DIAGNOSTIC: {label} ---")
    for h in soup.find_all(['h1','h2','h3']):
        print(f"  <{h.name}> '{h.get_text(strip=True)[:60]}'")
        count = 0
        for sib in h.next_siblings:
            if sib.name in ['h1','h2','h3']: break
            if sib.name == 'p':
                t = sib.get_text(strip=True)
                if t:
                    print(f"    <p> '{t[:60]}'")
                    count += 1
                    if count >= 8: break


def build_output(ez2_map, balls_map):
    now_ph = datetime.now(PH_TZ)
    return {
        'updated': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0',' '),
        'ez2': [{'draw':d,'nums':ez2_map.get(d,[]),'cutoff':c}
                for d,c in [('2PM',14),('5PM',17),('9PM',21)]],
        'balls': [{'game':gk,'nums':balls_map.get(gk,[]),
                   'done':len(balls_map.get(gk,[]))==6,
                   'jackpot':'','winners':0,'days':SCHED[gk]}
                  for gk in ['6/58','6/55','6/49','6/45','6/42']]
    }


def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper v17 DIAGNOSTIC — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print('=' * 50)

    # Diagnose EZ2 page
    try:
        print(f"Fetching {EZ2_URL} ...")
        html = fetch(EZ2_URL)
        diagnose(html, 'EZ2')
    except Exception as e:
        print(f"EZ2 ERROR: {e}")

    # Diagnose one ball page
    try:
        print(f"\nFetching {BALL_658} ...")
        html = fetch(BALL_658)
        diagnose(html, '6/58')
    except Exception as e:
        print(f"6/58 ERROR: {e}")

    # Save empty JSON so workflow doesn't fail
    output = build_output({'2PM':[],'5PM':[],'9PM':[]}, {})
    with open('pcso-results.json','w',encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print("\nSaved empty pcso-results.json (diagnostic run)")


if __name__ == '__main__':
    main()
