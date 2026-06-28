#!/usr/bin/env python3
"""
PCSO Results Scraper - DEBUG VERSION
Prints raw page content so we can see actual HTML structure
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
}

def fetch(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"  ERROR: {url} -> {e}")
        return None

def main():
    now_ph = datetime.now(PH_TZ)
    print(f"\nPCSO Scraper DEBUG — {now_ph.strftime('%Y-%m-%d %H:%M')} PH")
    print("=" * 50)

    url = 'https://www.lottopcso.com/'
    print(f"Fetching: {url}")
    html = fetch(url)

    if not html:
        print("FAILED to fetch")
        return

    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text()

    # Print first 3000 chars of plain text to see structure
    print("\n--- RAW TEXT (first 3000 chars) ---")
    print(text[:3000])
    print("\n--- END RAW TEXT ---")

    # Also search for key terms
    print("\n--- SEARCHING FOR KEY TERMS ---")
    for term in ['2D Lotto', 'EZ2', '2:00 PM', '9:00 PM', '6/58', 'Winning Combination',
                 'Jackpot', '24-04', '17-13', '46-56', 'Ultra Lotto']:
        idx = text.find(term)
        if idx >= 0:
            print(f"  FOUND '{term}' at {idx}: ...{repr(text[max(0,idx-20):idx+50])}...")
        else:
            print(f"  NOT FOUND: '{term}'")

    # Save empty json so commit doesn't fail
    output = {
        'updated': now_ph.isoformat(),
        'date': now_ph.strftime('%B %d, %Y').replace(' 0', ' '),
        'ez2': [
            {'draw': '2PM', 'nums': [], 'cutoff': 14},
            {'draw': '5PM', 'nums': [], 'cutoff': 17},
            {'draw': '9PM', 'nums': [], 'cutoff': 21}
        ],
        'balls': [
            {'game': g, 'date': 'Unknown', 'nums': [], 'done': False,
             'jackpot': '', 'winners': 0, 'days': d}
            for g, d in [('6/58',[0,2,5]),('6/55',[1,3,6]),
                         ('6/49',[0,2,4]),('6/45',[1,3,5]),('6/42',[2,4,6])]
        ]
    }
    with open('pcso-results.json', 'w') as f:
        json.dump(output, f, indent=2)
    print("\nSaved empty debug json")

if __name__ == '__main__':
    main()
