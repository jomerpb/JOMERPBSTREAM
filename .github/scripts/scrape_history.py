#!/usr/bin/env python3
"""
PCSO Historical Results Scraper
Fetches 3 months of past results from pcsodraw.com
Saves to pcso-history.json
Run once manually via GitHub Actions - takes ~3 minutes
"""

import requests
import json
import re
import time
from datetime import date, datetime, timezone, timedelta
from bs4 import BeautifulSoup

PH_TZ = timezone(timedelta(hours=8))

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-PH,en;q=0.9',
    'Referer': 'https://www.pcsodraw.com/',
}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

def fetch_page(url, retries=2):
    for attempt in range(retries + 1):
        try:
            r = SESSION.get(url, timeout=15)
            r.raise_for_status()
            return r.text
        except Exception as e:
            if attempt < retries:
                time.sleep(2)
            else:
                print(f"  FAILED: {url} — {e}")
                return None

def date_to_slug(d):
    return d.strftime('%d-%b-%Y').lower()

def parse_ez2_page(html, target_date):
    results = []
    if not html:
        return results
    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text()
    time_map = [('21:00', '9PM'), ('17:00', '5PM'), ('14:00', '2PM')]
    for time_key, draw_label in time_map:
        pattern = rf'{time_key}.*?results? are?:?\s*([\d]+)[,\s]+([\d]+)'
        m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if m:
            n1, n2 = int(m.group(1)), int(m.group(2))
            if 1 <= n1 <= 31 and 1 <= n2 <= 31:
                results.append({'date': target_date.isoformat(), 'draw': draw_label, 'nums': [n1, n2]})
    return results

def parse_6ball_page(html, game_key, target_date):
    if not html:
        return None
    soup = BeautifulSoup(html, 'html.parser')
    text = soup.get_text()
    nums = []
    m = re.search(r'results? are?:?\s*([\d,\s]+)', text, re.IGNORECASE)
    if m:
        raw = re.findall(r'\d+', m.group(1))
        nums = [int(n) for n in raw[:6] if 1 <= int(n) <= 58]
    if len(nums) != 6:
        m2 = re.search(r'(\d{1,2})-(\d{1,2})-(\d{1,2})-(\d{1,2})-(\d{1,2})-(\d{1,2})', text)
        if m2:
            nums = [int(m2.group(i)) for i in range(1, 7)]
    if len(nums) != 6:
        return None
    jackpot = ''
    jp_m = re.search(r'jackpot[^0-9]*[\u20b1P]?\s*([\d,]+(?:\.\d+)?)', text, re.IGNORECASE)
    if jp_m:
        try:
            jp_val = float(jp_m.group(1).replace(',', ''))
            if jp_val >= 1_000_000:
                jackpot = f'{jp_val/1_000_000:.1f}M'
        except:
            pass
    winners = 0
    win_m = re.search(r'Jackpot\s*\|\s*(\d+)\s*\|', text, re.IGNORECASE)
    if win_m:
        winners = int(win_m.group(1))
    return {'date': target_date.isoformat(), 'game': game_key, 'nums': nums, 'jackpot': jackpot, 'winners': winners}

def main():
    now_ph = datetime.now(PH_TZ)
    end_date = now_ph.date()
    start_date = end_date - timedelta(days=90)
    print(f"\nPCSO History Scraper — {start_date} to {end_date}")
    print("=" * 50)

    ez2_results = []
    ball_results = []

    # EZ2
    print(f"\n[EZ2]")
    current = start_date
    while current <= end_date:
        slug = date_to_slug(current)
        html = fetch_page(f'https://www.pcsodraw.com/ez2-lotto/results/{slug}/')
        if html:
            draws = parse_ez2_page(html, current)
            ez2_results.extend(draws)
            if draws: print(f"  {current}: {len(draws)} draws")
        current += timedelta(days=1)
        time.sleep(0.3)
    print(f"  Total: {len(ez2_results)} EZ2 records")

    # 6-ball games
    games = [
        {'key': '6/58', 'slug': 'ultra-lotto-658', 'days': [0, 2, 5]},
        {'key': '6/55', 'slug': 'grand-lotto-655', 'days': [1, 3, 6]},
        {'key': '6/49', 'slug': 'super-lotto-649', 'days': [0, 2, 4]},
        {'key': '6/45', 'slug': 'mega-lotto-645',  'days': [1, 3, 5]},
        {'key': '6/42', 'slug': 'lotto-642',        'days': [2, 4, 6]},
    ]
    for g in games:
        print(f"\n[{g['key']}]")
        count = 0
        current = start_date
        while current <= end_date:
            pcs_dow = (current.weekday() + 1) % 7
            if pcs_dow in g['days']:
                slug = date_to_slug(current)
                html = fetch_page(f'https://www.pcsodraw.com/{g["slug"]}/results/{slug}/')
                if html:
                    result = parse_6ball_page(html, g['key'], current)
                    if result:
                        ball_results.append(result)
                        count += 1
                        print(f"  {current}: {'-'.join(str(n) for n in result['nums'])}")
                time.sleep(0.3)
            current += timedelta(days=1)
        print(f"  Total: {count} draws")

    ez2_results.sort(key=lambda x: (x['date'], x['draw']), reverse=True)
    ball_results.sort(key=lambda x: (x['date'], x['game']), reverse=True)

    output = {
        'updated': now_ph.isoformat(),
        'range': {'from': start_date.isoformat(), 'to': end_date.isoformat()},
        'ez2': ez2_results,
        'balls': ball_results
    }

    with open('pcso-history.json', 'w') as f:
        json.dump(output, f, indent=2)

    size_kb = len(json.dumps(output)) / 1024
    print(f"\n{'='*50}")
    print(f"Saved pcso-history.json ({size_kb:.1f} KB)")
    print(f"EZ2: {len(ez2_results)} | Balls: {len(ball_results)}")

if __name__ == '__main__':
    main()
